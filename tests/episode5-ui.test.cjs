/* Interface exécutée dans un DOM minimal isolé : aucune sauvegarde du joueur modifiée. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const V = require('../episode5-core.js');
function harness(magic=false, testMode=false) {
  const elements=new Map(), timers=new Map(), relics=new Set(magic?['grimoire_runique']:[]), outcomes={}; let next=0;
  function element(){return {children:[],listeners:{},textContent:'',value:'',open:false,disabled:false,complete:false,
    append(el){this.children.push(el);},replaceChildren(){this.children=[];},setAttribute(){},focus(){},setSelectionRange(){},
    get firstElementChild(){return {remove:()=>this.children.shift()};},
    addEventListener(event,fn){this.listeners[event]=fn;},getContext(){return {fillRect(){},drawImage(){}};},
    showModal(){this.open=true;},close(){this.open=false;}};}
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const context={URLSearchParams,Valombre:V,document:{querySelector:get,createElement:element,addEventListener(){}},Image:function(){this.complete=false;},window:{location:{search:testMode?'?testSorts=1':''},
    setTimeout(fn,ms){timers.set(++next,{fn,ms});return next;},clearTimeout(id){timers.delete(id);},
    ChroniclesInventory:{owns:id=>relics.has(id),list:()=>[...relics],labels:{grimoire_runique:'Grimoire runique'},add:id=>relics.add(id),setOutcome:(k,v)=>outcomes[k]=v}
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../episode5.js'),'utf8'),context);
  return {get,timers,relics,outcomes,command(c){get('#commandInput').value=c;get('#commandForm').listeners.submit({preventDefault(){}});},reset(){get('#restartButton').listeners.click();}};
}
const commands=['montrer le mandat','nord','donner le pain','ouest','montrer le jeton','verser l’eau sur les entraves','est','est','montrer le jeton','lire','lire','lire','lire','lire','ouest','mettre le manteau','nord','dire la pierre se souvient','nord','examiner le portrait','examiner la tapisserie','ouest','tourner le treuil','est','nord','accuser le régent','tirer le levier','couvrir le médaillon avec le manteau','arrêter le régent'];
const h=harness();commands.forEach(c=>h.command(c));assert.match(h.get('#endingTitle').textContent,/juges/);assert.equal(h.get('#endingDialog').open,false);assert.equal(h.get('#commandInput').disabled,true);
assert.equal(h.timers.size,1);const victory=[...h.timers.values()][0];assert.equal(victory.ms,8000);victory.fn();assert.equal(h.get('#endingDialog').open,true);assert.equal(h.outcomes.pale_traitor,'captured_for_trial');assert.ok(h.relics.has('cles_valombre'));
h.reset();assert.equal(h.get('#endingDialog').open,false);assert.equal(h.timers.size,0);assert.equal(h.get('#commandInput').disabled,false);
const d=harness();for(let i=0;i<50;i++)d.command('attendre');assert.equal(d.get('#endingDialog').open,false);assert.equal(d.get('#commandInput').disabled,true);assert.equal(d.get('#commandForm button[type=submit]').disabled,true);
const death=[...d.timers.values()][0];assert.equal(death.ms,8000);assert.equal(d.relics.size,0);assert.deepEqual(d.outcomes,{});d.reset();assert.equal(d.timers.size,0);assert.match(d.get('#moveCounter').textContent,/^0 \/ 50/);
const m=harness(true);assert.equal(m.get('#spells').children.length,3);assert.ok(m.get('#spells').children.every(x=>x.textContent.endsWith('1 usage')));
assert.equal(m.get('#timeDescription').textContent,"50 actions restantes avant l’arrivée des renforts du traître");
const accusation=harness(); commands.slice(0,commands.indexOf('accuser le régent')).forEach(c=>accusation.command(c));
const accuseButton=accusation.get('#suggestions').children.find(button=>button.textContent==='accuser…'); assert.ok(accuseButton); accuseButton.listeners.click(); assert.equal(accusation.get('#commandInput').value,'accuser ');
console.log('Interface OK : victoire/mort différées de 8 s, boutons bloqués, timer annulé au redémarrage, reliques seulement à la victoire, sorts hérités.');
const sandbox=harness(false,true); assert.equal(sandbox.get('#spells').children.length,3); assert.equal(sandbox.get('#testModeNotice').hidden,false);
const shortcut=sandbox.get('#suggestions').children[0];shortcut.listeners.click();
assert.equal(sandbox.get('#commandInput').value,'examiner '); assert.match(sandbox.get('#moveCounter').textContent,/^0 \/ 50/);
commands.forEach(c=>sandbox.command(c));assert.match(sandbox.get('#endingText').textContent,/Mode test/);assert.equal(sandbox.relics.size,0);assert.deepEqual(sandbox.outcomes,{});
sandbox.reset();assert.ok(sandbox.get('#spells').children.every(x=>x.textContent.endsWith('1 usage')));
console.log('Mode test isolé et boutons de saisie génériques OK.');

