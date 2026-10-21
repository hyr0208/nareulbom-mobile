import test from 'node:test';
import assert from 'node:assert/strict';
import {assessHeadache,emptySymptomAnswers,riskQuestions} from './symptom-model.ts';
import {emptyHealthProfile,persistedSnapshot} from './medicine-model.ts';
const health=patch=>({version:1,consentAt:'2026-10-21T00:00:00Z',remember:true,profile:{...emptyHealthProfile(),ageBand:'30-39',weight:'60',conditions:{status:'none',items:[]},allergies:{status:'none',items:[]},pregnancy:'none',medicationStatus:'none',...patch}});
const answered=()=>({...emptySymptomAnswers(),consent:true,risks:Object.fromEntries(riskQuestions.map(item=>[item.id,'no'])),severity:'mild',duration:'today',repeated:'no',todayProducts:'no',heavyDrinking:'no',longPainkillerUse:'no',profileCurrent:'yes'});
test('consent is required to use symptom and profile answers',()=>{
  const a=answered();a.consent=false;a.risks.sudden='yes';assert.equal(assessHeadache(a,health(),[]).kind,'consent');
});
test('each emergency sign overrides incomplete questions, age and all other conditions',()=>{
  for(const id of ['sudden','neurological','injury','infection']){const a=emptySymptomAnswers();a.consent=true;a.risks[id]='yes';const result=assessHeadache(a,null,[]);assert.equal(result.kind,'emergency');assert.equal(result.ingredient,undefined);}
});
test('possible overdose, uncertain overdose and urgent symptoms bypass the unfinished form with no ingredient',()=>{
  for(const [id,value] of [['overdose','yes'],['overdose','unknown'],['urgent','yes']]){const a=emptySymptomAnswers();a.consent=true;a.risks[id]=value;const result=assessHeadache(a,null,[]);assert.equal(result.kind,'urgent');assert.equal(result.ingredient,undefined);}
});
test('unanswered or uncertain danger signs are never silently treated as absent',()=>{
  for(const value of ['','unknown']){const a=answered();a.risks.neurological=value;a.repeated='yes';const result=assessHeadache(a,health(),[]);assert.equal(result.kind,'questions');assert.equal(result.ingredient,undefined);}
});
test('severe, persistent, recurrent and prolonged painkiller use lead to clinical review, not a drug suggestion',()=>{
  for(const patch of [{severity:'severe'},{duration:'longer'},{repeated:'yes'},{longPainkillerUse:'yes'}]){const result=assessHeadache({...answered(),...patch},health(),[]);assert.ok(['urgent','appointment'].includes(result.kind));assert.equal(result.ingredient,undefined);}
});
test('every missing safety field or special health context blocks ingredient display',()=>{
  const patches=[{ageBand:''},{ageBand:'under19'},{weight:''},{weight:'49'},{weight:'invalid'},{conditions:{status:'yes',items:['시험 질환']}},{conditions:{status:'unknown',items:[]}},{allergies:{status:'yes',items:['시험 알레르기']}},{pregnancy:''},{pregnancy:'pregnant'},{pregnancy:'breastfeeding'},{medicationStatus:'taking'},{medicationStatus:''},{alcohol:'often'}];
  for(const patch of patches){const result=assessHeadache(answered(),health(patch),[]);assert.equal(result.kind,'questions');assert.equal(result.ingredient,undefined);}
  assert.equal(assessHeadache(answered(),null,[]).ingredient,undefined);
});
test('today products, heavy drinking and any registered product prevent an unrestricted ingredient suggestion',()=>{
  for(const patch of [{todayProducts:'yes'},{heavyDrinking:'yes'},{todayProducts:'unknown'},{profileCurrent:'no'},{profileCurrent:'unknown'}])assert.equal(assessHeadache({...answered(),...patch},health(),[]).ingredient,undefined);
  assert.equal(assessHeadache(answered(),health(),[{id:'test',source:'manual'}]).ingredient,undefined);
});
test('only a fully answered eligible case gets a pharmacist-discussion ingredient, without a dose or product',()=>{
  const result=assessHeadache(answered(),health(),[]);assert.equal(result.kind,'ingredient');assert.equal(result.ingredient,'acetaminophen');assert.equal(result.dose,undefined);assert.equal(result.product,undefined);
  const changed=assessHeadache(answered(),health({conditions:{status:'unknown',items:[]}}),[]);assert.equal(changed.ingredient,undefined);
});
test('symptom answers cannot become stored profile fields through snapshot serialization',()=>{
  const h=health();h.profile.symptoms=answered();const snapshot=persistedSnapshot({health:h,medicines:[],consentAt:null,onboardingDone:true});assert.equal(snapshot.health.profile.symptoms,undefined);assert.ok(!JSON.stringify(snapshot).includes('overdose'));
});
