import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyHealthProfile,emptyNutritionAnswers,validateHealthProfile,persistedSnapshot,restoreSnapshot} from './medicine-model.ts';
import {nutritionCandidates} from './nutrition-model.ts';
import {createVault} from './vault-core.ts';
const at='2026-10-21T00:00:00Z';
const answers=patch=>({...emptyNutritionAnswers(at),diet:'vegan',fortifiedB12:'no',calciumFoods:'often',supplements:'none',...patch});
const health=(nutrition=answers(),patch={})=>({version:1,consentAt:at,remember:false,profile:{...emptyHealthProfile(),ageBand:'30-39',conditions:{status:'none',items:[]},allergies:{status:'none',items:[]},pregnancy:'none',medicationStatus:'none',nutrition,...patch}});
test('old profiles and skipped nutrition consent never produce invented nutrient recommendations',()=>{
  const old={version:1,consentAt:at,remember:false,profile:emptyHealthProfile()};assert.deepEqual(nutritionCandidates(old,[]).candidates,[]);assert.equal(nutritionCandidates(null,[]).questions[0].step,6);assert.deepEqual(validateHealthProfile(old.profile),old.profile);
});
test('diet and fortified food answers change B12 candidates instead of goal or fatigue labels',()=>{
  assert.equal(nutritionCandidates(health(),[]).candidates[0].id,'b12');assert.equal(nutritionCandidates(health(),[]).candidates[0].status,'consider');
  for(const patch of [{fortifiedB12:'yes'},{diet:'mixed'}])assert.deepEqual(nutritionCandidates(health(answers(patch)),[]).candidates,[]);
  const unknown=nutritionCandidates(health(answers({fortifiedB12:''})),[]);assert.equal(unknown.candidates.length,0);assert.ok(unknown.questions.some(item=>item.label.includes('강화식품')));
  assert.deepEqual(nutritionCandidates(health(answers({diet:'mixed'}),{goals:['energy','sleep'],sleep:'under6'}),[]).candidates,[]);
});
test('calcium food frequency is a review reason, not a deficiency diagnosis',()=>{
  const result=nutritionCandidates(health(answers({diet:'mixed',calciumFoods:'rare'})),[]);assert.deepEqual(result.candidates.map(item=>item.id),['calcium']);assert.ok(result.candidates[0].checks.some(item=>item.includes('결핍')));
});
test('missing safety context, pregnancy, diagnoses and medicines prevent an unrestricted candidate state',()=>{
  for(const patch of [{ageBand:''},{ageBand:'under19'},{pregnancy:'pregnant'},{pregnancy:'breastfeeding'},{pregnancy:'planning'},{conditions:{status:'yes',items:['시험 질환']}},{allergies:{status:'yes',items:['시험 알레르기']}},{conditions:{status:'unknown',items:[]}},{medicationStatus:'taking'}])assert.equal(nutritionCandidates(health(answers(),patch),[]).candidates[0].status,'review');
  assert.equal(nutritionCandidates(health(),[{id:'manual-test',source:'manual'}]).candidates[0].status,'review');
});
test('an already consumed nutrient is a duplication check, never a new addition recommendation',()=>{
  const result=nutritionCandidates(health(answers({supplements:'taking',nutrients:['b12']})),[]);assert.equal(result.candidates[0].status,'existing');assert.ok(result.candidates[0].checks.some(item=>item.includes('총섭취량')));
});
test('low clinician-reported vitamin D yields medical review; high values hold additions; unknown and normal do not trigger it',()=>{
  for(const [lab,status] of [['low','review'],['high','hold']]){const result=nutritionCandidates(health(answers({diet:'mixed',labs:{b12:'unknown',calcium:'unknown',vitaminD:lab}})),[]);assert.equal(result.candidates[0].id,'vitaminD');assert.equal(result.candidates[0].status,status);}
  for(const lab of ['unknown','normal','not-tested'])assert.equal(nutritionCandidates(health(answers({diet:'mixed',labs:{b12:'unknown',calcium:'unknown',vitaminD:lab}})),[]).candidates.length,0);
});
test('nutrition answers require valid explicit consent, choices and consistent existing supplement answers',()=>{
  for(const patch of [{consentAt:''},{version:2},{diet:'unrecognized'},{supplements:'none',nutrients:['b12']},{labs:{b12:'1',calcium:'normal',vitaminD:'unknown'}}])assert.throws(()=>validateHealthProfile(health(answers(patch)).profile));
});
test('consented nutrition survives secure snapshot restoration; temporary answers are excluded',()=>{
  const h=health();const temp=persistedSnapshot({health:h,medicines:[],consentAt:null,onboardingDone:true});assert.equal(temp.health,undefined);
  const saved=persistedSnapshot({health:{...h,remember:true},medicines:[],consentAt:null,onboardingDone:true});assert.deepEqual(restoreSnapshot(JSON.parse(JSON.stringify(saved))).health.profile.nutrition,h.profile.nutrition);
});
test('saving nutrition consent withdrawal removes previous answers from both secure-store banks',async()=>{
  const values=new Map();const store={get:async key=>values.get(key)??null,set:async(key,value)=>{values.set(key,value);},remove:async key=>{values.delete(key);}};
  const h={...health(),remember:true};const base={medicines:[],consentAt:null,onboardingDone:true};const vault=createVault(store);
  await vault.write(persistedSnapshot({...base,health:h}));const withdrawn={...h,profile:{...h.profile,nutrition:undefined}};await vault.write(persistedSnapshot({...base,health:withdrawn}));
  const restored=restoreSnapshot(await createVault(store).read());assert.equal(restored.health.profile.nutrition,undefined);assert.ok([...values.values()].every(value=>!value.includes('fortifiedB12')));
});
