import { StyleSheet, View } from 'react-native';

export type WellnessIconKind = 'nutrition' | 'search' | 'medicines' | 'profile' | 'guide' | 'symptoms';

// Decorative, code-drawn pictograms stay crisp at every display density.
export function WellnessIcon({ kind }: { kind: WellnessIconKind }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.canvas}>
    {kind === 'nutrition' && <>
      <View style={s.bottle}><View style={s.bottleLabel}><View style={s.leaf} /></View></View>
      <View style={s.cap} /><View style={s.tablet} />
    </>}
    {kind === 'search' && <>
      <View style={s.capsule}><View style={s.capsuleHalf} /><View style={s.shine} /></View>
      <View style={s.glassHandle} /><View style={s.glass}><View style={s.glassGlint} /></View>
    </>}
    {kind === 'medicines' && <>
      <View style={s.caseHandle} /><View style={s.case}><View style={s.crossHorizontal} /><View style={s.crossVertical} /></View>
      <View style={s.caseLine} />
    </>}
    {kind === 'guide' && <>
      <View style={s.bookLeft}><View style={s.bookLine}/><View style={s.bookLine}/><View style={[s.bookLine,{width:11}]}/></View>
      <View style={s.bookRight}><View style={s.bookLine}/><View style={s.bookLine}/><View style={[s.bookLine,{width:10}]}/></View>
      <View style={s.spine}/><View style={s.bookmark}/>
    </>}
    {kind === 'symptoms' && <>
      <View style={s.heartLeft}/><View style={s.heartRight}/><View style={s.heartBase}/>
      <View style={s.pulseStart}/><View style={s.pulseRise}/><View style={s.pulseFall}/><View style={s.pulseEnd}/>
    </>}
    {kind === 'profile' && <>
      <View style={s.board}><View style={s.sheet}><View style={s.avatar} /><View style={s.line} /><View style={[s.line,{width:16}]} /></View></View>
      <View style={s.clip} /><View style={s.check}><View style={s.checkMark} /></View>
    </>}
  </View>;
}

const s = StyleSheet.create({
  canvas:{width:56,height:56},
  bookLeft:{position:'absolute',left:4,top:12,width:24,height:35,borderTopLeftRadius:6,borderBottomLeftRadius:5,backgroundColor:'#9ACDBF',padding:5,paddingTop:10,gap:5,transform:[{skewY:'8deg'}]},
  bookRight:{position:'absolute',right:4,top:12,width:24,height:35,borderTopRightRadius:6,borderBottomRightRadius:5,backgroundColor:'#C5E4DA',padding:5,paddingTop:10,gap:5,transform:[{skewY:'-8deg'}]},
  bookLine:{height:2,width:14,borderRadius:2,backgroundColor:'#F4FBF8'},
  spine:{position:'absolute',left:27,top:14,width:2,height:35,backgroundColor:'#74B7A4'},
  bookmark:{position:'absolute',right:12,top:9,width:6,height:14,borderBottomLeftRadius:2,borderBottomRightRadius:2,backgroundColor:'#F4C778'},
  heartLeft:{position:'absolute',left:6,top:10,width:27,height:27,borderRadius:14,backgroundColor:'#F3A6AB'},
  heartRight:{position:'absolute',right:6,top:10,width:27,height:27,borderRadius:14,backgroundColor:'#F3A6AB'},
  heartBase:{position:'absolute',left:14,top:20,width:28,height:28,borderRadius:5,backgroundColor:'#F3A6AB',transform:[{rotate:'45deg'}]},
  pulseStart:{position:'absolute',left:10,top:29,width:10,height:3,borderRadius:2,backgroundColor:'#FFF7F8'},
  pulseRise:{position:'absolute',left:20,top:23,width:3,height:13,borderRadius:2,backgroundColor:'#FFF7F8',transform:[{rotate:'20deg'}]},
  pulseFall:{position:'absolute',left:28,top:24,width:3,height:15,borderRadius:2,backgroundColor:'#FFF7F8',transform:[{rotate:'-35deg'}]},
  pulseEnd:{position:'absolute',left:32,top:30,width:13,height:3,borderRadius:2,backgroundColor:'#FFF7F8'},
  bottle:{position:'absolute',left:11,top:14,width:32,height:36,borderRadius:9,backgroundColor:'#FFE1AD'},
  cap:{position:'absolute',left:13,top:7,width:28,height:11,borderRadius:4,backgroundColor:'#F6B954'},
  bottleLabel:{position:'absolute',left:4,right:4,top:10,height:17,borderRadius:4,backgroundColor:'#FFF9E9',alignItems:'center',justifyContent:'center'},
  leaf:{width:11,height:8,borderTopLeftRadius:8,borderBottomRightRadius:8,backgroundColor:'#79B99E',transform:[{rotate:'-35deg'}]},
  tablet:{position:'absolute',right:2,bottom:4,width:17,height:9,borderRadius:5,backgroundColor:'#F4C778',transform:[{rotate:'-32deg'}]},
  capsule:{position:'absolute',left:8,top:7,width:23,height:42,borderRadius:13,overflow:'hidden',backgroundColor:'#B6D9FF',transform:[{rotate:'37deg'}]},
  capsuleHalf:{position:'absolute',bottom:0,width:23,height:21,backgroundColor:'#78AEEF'},
  shine:{position:'absolute',left:5,top:7,width:4,height:10,borderRadius:3,backgroundColor:'#EFF7FF'},
  glassHandle:{position:'absolute',right:3,bottom:2,width:7,height:20,borderRadius:4,backgroundColor:'#596E95',transform:[{rotate:'-40deg'}]},
  glass:{position:'absolute',right:6,top:23,width:25,height:25,borderRadius:13,borderWidth:5,borderColor:'#6F88B3',backgroundColor:'#E8F4FF'},
  glassGlint:{position:'absolute',left:3,top:2,width:4,height:7,borderRadius:3,backgroundColor:'#FFFFFF',transform:[{rotate:'35deg'}]},
  caseHandle:{position:'absolute',left:19,top:6,width:19,height:13,borderRadius:5,borderWidth:4,borderColor:'#73BDAA'},
  case:{position:'absolute',left:5,top:16,width:46,height:34,borderRadius:9,backgroundColor:'#A4DCCB',alignItems:'center',justifyContent:'center'},
  crossHorizontal:{position:'absolute',width:20,height:7,borderRadius:2,backgroundColor:'#FFFFFF'},
  crossVertical:{position:'absolute',width:7,height:20,borderRadius:2,backgroundColor:'#FFFFFF'},
  caseLine:{position:'absolute',left:8,right:8,top:45,height:5,borderBottomLeftRadius:5,borderBottomRightRadius:5,backgroundColor:'#8DCDBB'},
  board:{position:'absolute',left:10,top:9,width:35,height:43,borderRadius:7,backgroundColor:'#C9C5E8',padding:5},
  sheet:{flex:1,borderRadius:3,backgroundColor:'#F6F4FF',padding:5,gap:4},
  avatar:{width:10,height:10,borderRadius:5,backgroundColor:'#A69DD3'},
  line:{height:3,width:13,borderRadius:2,backgroundColor:'#CDC6E7'},
  clip:{position:'absolute',left:20,top:5,width:15,height:9,borderRadius:4,backgroundColor:'#A69DD3'},
  check:{position:'absolute',right:2,bottom:1,width:20,height:20,borderRadius:10,backgroundColor:'#89C9AD',alignItems:'center',justifyContent:'center'},
  checkMark:{width:9,height:5,borderLeftWidth:2,borderBottomWidth:2,borderColor:'#FFFFFF',transform:[{rotate:'-45deg'}],marginTop:-2},
});
