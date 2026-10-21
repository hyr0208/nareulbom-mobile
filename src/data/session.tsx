import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Drug } from '@/services/api';

type Session = {
  medicines: Drug[]; addMedicine: (drug: Drug) => void; removeMedicine: (id: string) => void;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<Drug[]>([]);
  return <Context.Provider value={{ medicines,
    addMedicine: drug => setMedicines(old => old.some(item => item.id === drug.id) ? old : [...old, drug]),
    removeMedicine: id => setMedicines(old => old.filter(item => item.id !== id)),
  }}>{children}</Context.Provider>;
}
export function useSession() {
  const session = useContext(Context);
  if (!session) throw new Error('SessionProvider is required');
  return session;
}
