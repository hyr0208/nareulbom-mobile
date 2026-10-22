import { Platform } from 'react-native';
import { reminderPrefix, syncReminderPlan, type ReminderTime } from '@/data/reminder-model';
export const remindersAvailable = Platform.OS === 'ios' || Platform.OS === 'android';
let modulePromise: Promise<typeof import('expo-notifications')> | undefined;
async function notifications() {
  if (!remindersAvailable) throw new Error('기기 알림은 모바일 앱에서 이용할 수 있어요.');
  if (!modulePromise) modulePromise = import('expo-notifications').then(module => {
    module.setNotificationHandler({handleNotification:async notification => {
      const ours = notification.request.identifier.startsWith(reminderPrefix);
      return {shouldShowBanner:ours,shouldShowList:ours,shouldPlaySound:ours,shouldSetBadge:false};
    }});
    return module;
  }).catch(() => { modulePromise = undefined; throw new Error('현재 앱에서 알림 모듈을 연결하지 못했어요. 새 빌드로 실행한 뒤 다시 시도해 주세요.'); });
  return modulePromise;
}
export async function reminderPermission(request = false): Promise<boolean> {
  const n = await notifications();
  if (Platform.OS === 'android') await n.setNotificationChannelAsync('dose-reminders',{name:'복용 일정 알림',importance:n.AndroidImportance.DEFAULT,lockscreenVisibility:n.AndroidNotificationVisibility.PRIVATE});
  let permission = await n.getPermissionsAsync();
  if (request && !permission.granted && permission.canAskAgain) permission = await n.requestPermissionsAsync({ios:{allowAlert:true,allowSound:true,allowBadge:false}});
  return Platform.OS === 'ios' ? [n.IosAuthorizationStatus.AUTHORIZED,n.IosAuthorizationStatus.PROVISIONAL,n.IosAuthorizationStatus.EPHEMERAL].includes(permission.ios?.status ?? n.IosAuthorizationStatus.NOT_DETERMINED) : permission.granted;
}
export async function cancelReminders(): Promise<void> {
  if (!remindersAvailable) return;
  const n = await notifications();
  const scheduled = await n.getAllScheduledNotificationsAsync();
  const results = await Promise.allSettled(scheduled.filter(item => item.identifier.startsWith(reminderPrefix)).map(item => n.cancelScheduledNotificationAsync(item.identifier)));
  if (results.some(result => result.status === 'rejected')) throw new Error('기존 알림 취소를 완료하지 못했어요. 다시 시도해 주세요.');
  const delivered = await n.getPresentedNotificationsAsync();
  const dismissed = await Promise.allSettled(delivered.filter(item => item.request.identifier.startsWith(reminderPrefix)).map(item => n.dismissNotificationAsync(item.request.identifier)));
  if (dismissed.some(result => result.status === 'rejected')) throw new Error('표시된 알림 정리를 완료하지 못했어요. 다시 시도해 주세요.');
}
async function schedule(time: ReminderTime) {
  const n = await notifications();
  await n.scheduleNotificationAsync({identifier:time.id,content:{title:'나를봄 · 복용 일정 확인',body:'직접 등록한 일정이 있어요. 앱에서 오늘의 복용을 확인해 주세요.',sound:'default',data:{kind:'dose-reminder'}},trigger:{type:n.SchedulableTriggerInputTypes.DAILY,hour:time.hour,minute:time.minute,...(Platform.OS === 'android' ? {channelId:'dose-reminders'} : {})}});
}
export async function syncReminders(plan: ReminderTime[]): Promise<number> {
  if (!remindersAvailable) return 0;
  return syncReminderPlan({cancel:cancelReminders,allowed:() => reminderPermission(),schedule},plan);
}
export async function listenForReminderOpen(onOpen: () => void): Promise<() => void> {
  if (!remindersAvailable) return () => {};
  const n = await notifications();
  const handle = (response: import('expo-notifications').NotificationResponse | null) => {
    if (response?.notification.request.identifier.startsWith(reminderPrefix)) { onOpen(); void n.clearLastNotificationResponseAsync().catch(() => {}); }
  };
  const listener = n.addNotificationResponseReceivedListener(handle);
  try { handle(await n.getLastNotificationResponseAsync()); }
  catch (error) { listener.remove(); throw error; }
  return () => listener.remove();
}
