const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const V = require('../episode5-core.js');
let checks = 0;
const test = (name, fn) => { fn(); checks++; console.log('OK ' + name); };
const run = (g, commands) => commands.forEach(c => g.act(c));
const start = ['montrer le mandat à Oren', 'nord', 'donner le pain à Ysilde', 'ouest', 'montrer le jeton à Borin', 'verser l’eau sur les entraves', 'est', 'est', 'montrer le jeton à Ardel'];
const archiveExit = ['lire', 'lire', 'lire', 'lire', 'lire', 'ouest', 'mettre le manteau', 'nord'];
const gallery = ['dire la pierre se souvient', 'nord', 'examiner le portrait', 'examiner la tapisserie', 'ouest'];
const toThrone = ['tourner le treuil', 'est', 'nord'];
const finale = ['accuser le régent', 'tirer le levier rouge', 'jeter le manteau sur le médaillon', 'mettre les entraves au régent'];
const escape = ['prendre le clou', 'soulever la grille avec le clou', 'ramper dans le conduit'];
function ready(magic = false) { const g = V.create({grimoire:magic}); run(g, [...start, ...archiveExit, ...gallery, ...toThrone]); assert.equal(g.state.room,'trone'); return g; }
test('parcours complet sans API ni grimoire, climax en quatre actes', () => {
  const g=ready(); assert.equal(g.state.won,false);
  finale.forEach((c,i)=>{g.act(c); assert.equal(g.state.won,i===3);});
  assert.ok(g.state.turns<45); assert.ok(g.state.inventory.includes('cles'));
  assert.equal(g.state.dead,false); console.log('Parcours sans magie : '+g.state.turns+' actions');
});
test('trois usages utiles raccourcissent le même parcours', () => {
  const g=V.create({grimoire:true}); run(g,start); g.act('lancer le sort de lumière'); run(g,archiveExit);
  g.act('manipulation mentale'); run(g,gallery); g.act('lancer une boule de feu'); run(g,[...toThrone,...finale]);
  assert.equal(g.state.won,true); assert.deepEqual(g.state.spells,{lumiere:0,feu:0,esprit:0});
  const plain=ready(); run(plain,finale); assert.equal(plain.state.turns-g.state.turns,7);
});
test('sans épisode IV, aucun sort utilisable', () => {const g=V.create(); const before=JSON.stringify(g.state); run(g,['lumière','boule de feu','manipulation mentale']); assert.equal(JSON.stringify(g.state),before);});
test('un sort épuisé et une cible absente ne consomment rien', () => {
  const g=V.create({grimoire:true}); g.act('lumière'); assert.equal(g.state.spells.lumiere,1); assert.equal(g.state.turns,0);
  run(g,start); g.act('lumière'); const t=g.state.turns; g.act('lancer lumière'); assert.equal(g.state.turns,t); assert.equal(g.state.spells.lumiere,0);
});
test('lumière au poste : capture, sort perdu, trois actions pour sortir', () => {
  const g=V.create({grimoire:true}); run(g,[...start,...archiveExit]); const items=[...g.state.inventory], t=g.state.turns;
  g.act('lumière'); assert.equal(g.state.room,'geole'); assert.equal(g.state.turns,t+5); assert.equal(g.state.spells.lumiere,0); assert.deepEqual(g.state.inventory,[]);
  run(g,escape); assert.equal(g.state.room,'place'); assert.equal(g.state.turns,t+8); assert.deepEqual(g.state.inventory,items);
  run(g,['mettre le manteau','nord',...gallery,...toThrone,...finale]); assert.equal(g.state.won,true);
});
test('feu à la forge : colère, excuses et progression toujours possible', () => {
  const g=V.create({grimoire:true}); run(g,start.slice(0,4)); const t=g.state.turns; g.act('boule de feu');
  assert.equal(g.state.turns,t+4); assert.equal(g.state.spells.feu,0); assert.equal(g.state.memory.borin.angry,true);
  g.act('montrer le jeton'); assert.equal(g.state.flags.forged,undefined);
  run(g,['présenter mes excuses à Borin','montrer le jeton','refroidir les entraves']); assert.ok(g.state.inventory.includes('entraves'));
});
test('esprit contre régent : retour de sort, puis nouvelle arrestation possible', () => {
  const g=V.create({grimoire:true}); run(g,[...start,'lumière',...archiveExit,...gallery,'boule de feu',...toThrone]); g.act('accuser le régent'); g.act('manipulation mentale'); assert.equal(g.state.room,'geole'); assert.equal(g.state.spells.esprit,0); assert.equal(g.state.stage,0);
  run(g,[...escape,'mettre le manteau','nord','dire la pierre se souvient','nord','nord',...finale]); assert.equal(g.state.won,true);
});
test('mémoire des menaces, refus, excuses, dénonciation et évasions répétées', () => {
  const g=V.create(); run(g,['montrer le mandat','nord','menacer Ysilde','donner le pain']); assert.ok(g.state.inventory.includes('pain'));
  run(g,['présenter mes excuses à Ysilde','donner le pain']); assert.ok(g.state.inventory.includes('manteau')); assert.equal(g.state.memory.ysilde.apologies,1);
  g.act('menacer Ysilde'); assert.equal(g.state.room,'geole'); run(g,escape); assert.equal(g.state.memory.ysilde.angry,true);
  g.act('menacer Ysilde'); assert.equal(g.state.room,'geole'); run(g,escape); assert.equal(g.state.room,'place'); assert.equal(g.state.captures,2);
});
test('relève à 30, avertissements à 40 et 45, mort à 50, état terminal figé', () => {
  const g=V.create(); const messages=[]; for(let i=0;i<50;i++) messages.push(...g.act('attendre').map(x=>x.text));
  assert.ok(messages.some(x=>x.startsWith('30 ACTIONS'))); assert.ok(messages.some(x=>x.startsWith('10 ACTIONS'))); assert.ok(messages.some(x=>x.startsWith('5 ACTIONS')));
  assert.equal(g.state.dead,true); assert.equal(g.state.won,false); assert.equal(g.state.turns,50); const before=JSON.stringify(g.state); g.act('nord'); assert.equal(JSON.stringify(g.state),before);
});
test('arrestation à la 50e action autorisée, pas après', () => {
  const g=ready(); run(g,finale.slice(0,3)); while(g.state.turns<49) g.act('attendre'); g.act(finale[3]); assert.equal(g.state.won,true); assert.equal(g.state.turns,50); assert.equal(g.state.dead,false);
  const h=ready(); run(h,finale.slice(0,3)); while(h.state.turns<50) h.act('attendre'); h.act(finale[3]); assert.equal(h.state.dead,true); assert.equal(h.state.won,false);
});
test('lecture répétée franchissant l’échéance et mort en geôle', () => {
  const g=V.create(); run(g,start); while(g.state.turns<48)g.act('attendre'); g.act('lire'); assert.equal(g.state.dead,false); g.act('lire'); assert.equal(g.state.dead,true); assert.equal(g.state.turns,50);
  const h=ready(true); while(h.state.turns<45)h.act('attendre'); h.act('manipulation mentale'); assert.equal(h.state.dead,true); assert.equal(h.state.room,'geole');
});
test('contrôle après relève coûte cinq actions, magie ne remplace ni manteau ni preuve', () => {
  const g=V.create({grimoire:true}); run(g,[...start,...archiveExit]); while(g.state.turns<30)g.act('attendre'); const t=g.state.turns; g.act('dire la pierre se souvient'); assert.equal(g.state.turns,t+5);
  const h=V.create({grimoire:true}); run(h,['montrer le mandat','nord','nord','manipulation mentale','dire la pierre se souvient']); assert.equal(h.state.flags.passed,undefined);
});
test('commandes gratuites, répétitions et prérequis empêchent les raccourcis', () => {
  const g=V.create(); run(g,['nord','regarder','indice','carnet','inventaire','blablabla']); assert.equal(g.state.turns,0); assert.equal(g.state.room,'porte');
  run(g,['montrer le mandat','nord','nord','nord']); assert.equal(g.state.room,'caserne'); assert.equal(g.state.flags.passed,undefined);
  const h=ready(); run(h,['mettre les entraves au régent','tirer le levier','jeter le manteau']); assert.equal(h.state.stage,0); assert.equal(h.state.won,false);
});
test('formulations usuelles et accents', () => {
  const g=V.create(); run(g,['je montre le mandat à Oren','aller au nord','donner ma miche de pain à Ysilde','ouest','présenter le jeton à Borin','refroidir les entraves','est','est','montrer le jeton','consulter','consulter','consulter','consulter','consulter','ouest','enfiler le manteau','nord','prononcer la pierre se souvient','nord','observer le portrait','examiner la tapisserie','ouest','armer le contrepoids','est','nord',...finale]); assert.equal(g.state.won,true);
});
test('neuf images originales distinctes, vignette d’ouverture et Umami conservés', () => {
  const imgs=Object.values(V.rooms).map(r=>r.image); assert.equal(imgs.length,9); assert.equal(new Set(imgs).size,9);
  imgs.forEach(f=>{ assert.match(f,/e5-v3-/); assert.ok(fs.existsSync(path.join(__dirname,'..',f))); });
  for(const name of ['episode5.html','index.html']){const html=fs.readFileSync(path.join(__dirname,'..',name),'utf8'); assert.equal((html.match(/data-website-id="c565782b-5375-47bb-89ef-7c76d2ce808c"/g)||[]).length,1);}
  assert.ok(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').includes(V.rooms.porte.image));
});
test('suggestions génériques et objectif sans solution', () => {
 const g=V.create();
 for(const room of Object.keys(V.rooms)) {g.state.room=room;
 assert.ok(g.suggestions().every(x=>['examiner','prendre','utiliser','parler','lire','accuser','nord','sud','est','ouest'].includes(x)));
 assert.doesNotMatch(g.objective(),/mandat|manteau|clou|levier|jeton|entraves/i);
 }
});
test('mettre le manteau à la forge ne refroidit pas les entraves', () => {
 const g=V.create(); run(g,['montrer le mandat','nord','donner le pain','ouest','montrer le jeton']);
 const output=g.act('mettre le manteau');
 assert.equal(g.state.flags.cloakOn,true); assert.equal(g.state.inventory.includes('entraves'),false);
 assert.equal(g.state.flags.forged,true);
 assert.ok(output.every(x=>!x.text.includes('entraves')));
});
test('attaquer le sergent sous plusieurs formulations conduit en geôle', () => {
 for (const command of ['attaquer le sergent','frapper le garde','poignarder le sergent','agresser le garde','assommer le sergent','charger le garde','donner un coup au sergent']) {
   const g=V.create(); g.state.room='caserne'; g.act(command);
   assert.equal(g.state.room,'geole',command); assert.equal(g.state.captures,1,command);
 }
});
test('formulations naturelles pour la manivelle et le treuil', () => {
 for (const command of ['faire tourner la manivelle','tourner la manivelle','armer le treuil','actionner le treuil','manœuvrer la manivelle']) {
   const g=V.create(); g.state.room='tour'; g.act(command);
   assert.equal(g.state.flags.armed,true,command);
 }
});
test('les textes automatiques demandés ne donnent plus ces solutions', () => {
 const source=fs.readFileSync(path.join(__dirname,'../episode5-core.js'),'utf8');
 assert.ok(!source.includes('Ysilde est sur la place. Aide-la'));
 assert.ok(!source.includes('Tous deux connaissent le signe d’Oren'));
 assert.ok(!source.includes('Pas de magie de feu'));
 assert.ok(!fs.readFileSync(path.join(__dirname,'../episode5.html'),'utf8').includes('id="objective"'));
});
test('archives : cinq lectures progressives sans magie', () => {
 const g=V.create(); run(g,start);
 for(let i=1;i<=4;i++){const out=g.act('lire'); assert.equal(g.state.flags.archiveReads,i); assert.equal(g.state.inventory.includes('ordre'),false); assert.ok(out.some(x=>x.text.includes(['LA…','LA PIERRE…','LA PIERRE SE…','LA PIERRE SE SOU…'][i-1])));}
 g.act('lire'); assert.equal(g.state.flags.archiveReads,5); assert.equal(g.state.inventory.includes('ordre'),true); assert.ok(g.state.clues.includes('ordre'));
});
test('Lumière termine en une lecture un déchiffrage déjà commencé', () => {
 const g=V.create({grimoire:true}); run(g,start); run(g,['lire','lire']); const before=g.state.turns;
 g.act('lumière'); assert.equal(g.state.inventory.includes('ordre'),false); g.act('lire');
 assert.equal(g.state.inventory.includes('ordre'),true); assert.equal(g.state.flags.archiveReads,5); assert.equal(g.state.turns,before+2);
});
test('boule de feu contre Edran est absorbée par son amulette', () => {
 const g=ready(true), before=g.state.turns; const out=g.act('boule de feu contre Edran Veyl');
 assert.equal(g.state.spells.feu,0); assert.equal(g.state.turns,before+1); assert.equal(g.state.room,'trone'); assert.equal(g.state.stage,0); assert.ok(out.some(x=>/amulette/.test(x.text)));
});
test('devant Edran, la proposition Accuser amorce la commande', () => { const g=ready(); assert.ok(g.suggestions().includes('accuser')); });
test('les cinq quêtes utilisent des volumes renforcés', () => {
 const files=['game.js','episode2.js','episode3.js','episode4.js','episode5.js'].map(name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8'));
 assert.match(files[0],/volume = 0\.04/); assert.match(files[1],/volume = 0\.035/); assert.match(files[2],/volume = 0\.035/); assert.match(files[3],/volume = 0\.04/); assert.match(files[4],/setValueAtTime\(0\.025/);
});
console.log(checks+' contrôles réussis.');
