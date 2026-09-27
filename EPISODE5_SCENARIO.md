# Épisode V — La Cité du Traître Blafard

## Intention de cette réécriture

Une infiltration lisible, jouable sans API ni grimoire. Une seule résolution par épreuve, fondée sur des objets et des indices concrets. Les sorts modifient le coût ou les conséquences : ils ne constituent jamais une autre solution à une énigme. Les autres pistes de GAME_DESIGN_RULES restent facultatives.

**Mission annoncée dès la première ligne : capturer Edran Veyl vivant pour le faire juger avant l’arrivée des renforts, dans 50 actions.** Le Conseil veut connaître ses complices ; le tuer ferait échouer ce projet. Oren prépare les habitants à reprendre les portes au signal de la herse du palais.

## Présentation au joueur

Ce document est un guide d'auteur : il contient les solutions, contrairement aux descriptions du jeu. Dans l'interface, l'objectif reste « Capturer Edran vivant ». Les descriptions exposent des faits observables ; la déduction vient au joueur. Les boutons génériques amorcent la saisie sans nommer de cible. INDICE est la seule aide donnant volontairement la prochaine action.

## Test des sorts sans sauvegarde

Ouvrir `episode5.html?testSorts=1`. Les trois sorts sont disponibles sans réussir l'épisode IV. Ce mode n'écrit ni relique ni résultat permanent, même en cas de victoire. Recommencer restitue les charges ; retirer le paramètre rétablit les conditions normales. Aucun grimoire n'est ajouté au profil.

## Progression et neuf décors originaux

1. **Porte des Cendres.** Montrer le mandat à Oren. Il ouvre la poterne et remet le jeton du réseau. Il explique qui aidera le héros et pourquoi prendre le régent vivant.
2. **Place des Veilleurs.** Ysilde nourrit les enfants du quartier. Lui donner la miche de pain initiale gagne sa confiance ; elle remet un manteau de service du palais.
3. **Forge des Chaînes.** Montrer le jeton à Borin, puis refroidir les rivets avec l’eau du seau. Le héros obtient les entraves nécessaires à l’arrestation.
4. **Archives du Siège.** Montrer le jeton à Ardel, puis lire cinq fois le registre obscur. Chaque lecture coûte une action et révèle une partie supplémentaire du mot de garde. À la cinquième, « La pierre se souvient » est complet et l’ordre signé par Edran peut être emporté. Si Lumière a été lancée, la prochaine commande « lire » achève immédiatement le déchiffrage, même déjà commencé.
5. **Poste de garde.** Enfiler le manteau, puis donner le mot de garde. Le sergent contrôle le visiteur et ouvre la galerie. Un sort ne remplace ni le vêtement ni la découverte du registre.
6. **Geôle sous la citerne.** Scène de capture facultative, et non détour obligatoire. Prendre le clou sous la gamelle, soulever la grille avec le clou, ramper dans le conduit. Toutes les affaires sont récupérées au débouché, puis le héros rejoint la place.
7. **Galerie des Serments.** Examiner le portrait : le médaillon renvoie les attaques mentales, mais un tissu le neutralise. Examiner la tapisserie : le treuil arme le contrepoids, le levier rouge abaisse la herse. Les deux observations sont consignées.
8. **Tour du Contrepoids.** Tourner le treuil malgré le givre pour armer la herse. Le coût de cinq actions est indiqué avant l’effort.
9. **Salle du Trône.** Quatre gestes successifs, pas une victoire automatique : présenter les preuves, tirer le levier, couvrir le médaillon avec le manteau, poser les entraves.

Les images sont `assets/e5-v3-01-porte.png` à `assets/e5-v3-09-trone.png` (noms complets dans le moteur). Chacune résulte d’une génération originale distincte. Aucun visuel des épisodes I à IV n’est utilisé. La vignette d’accueil montre uniquement la Porte des Cendres. Prompts et provenance : `EPISODE5_ART_MANIFEST.json`, génération intégrée image_gen, neuf appels, aucune variante.

## Le climax

L’ordre signé et le mandat sont lus devant les gardes. Le régent avoue avec arrogance et recule vers ses hommes. Le héros tire le levier : la herse l’isole dans un fracas auquel répondent les cloches d’Oren. Edran tente d’asservir le héros avec son médaillon. Le manteau étouffe sa lumière. À genoux, le régent cherche encore son poignard ; il faut enfin lui poser les entraves.

Le héros prend les clés à sa ceinture. Les résistants occupent le palais et ferment les portes devant la colonne privée de son chef. Edran reste vivant : le procès est à venir. Les clés et l’issue `captured_for_trial` sont enregistrées dans l’inventaire/les conséquences permanentes seulement après victoire.

## Horloge équitable

- 50 actions disponibles. Une arrestation accomplie par la 50e action est une réussite. Sinon, à 50, les renforts identifient et tuent le héros, y compris s’il est en geôle.
- Déplacement, découverte ou manipulation : une action, sauf coût annoncé.
- Registre : cinq commandes « lire » d’une action chacune, ou une seule lecture après Lumière. Treuil : cinq actions, ou une après Boule de feu.
- Contrôle du sergent : trois actions avant la relève, cinq à partir de 30, une après Manipulation mentale.
- Avertissements aux actions 30, 40 (10 restantes) et 45 (5 restantes).
- Regarder, aide, indice, carnet, inventaire, commandes incomprises/refusées et dialogues déjà entendus : gratuits. La lecture réelle du joueur n’est jamais chronométrée.
- Capture : quatre actions de transfert. Évasion : trois actions. Remettre le manteau et repasser le contrôle coûte du temps supplémentaire.
- Parcours de référence sans magie : 35 actions ; avec les trois usages favorables : 28. La marge permet de comprendre les lieux et de survivre à une capture.
- Mort et victoire bloquent les commandes ; la fenêtre finale apparaît après huit secondes. Recommencer annule la fenêtre différée et réinitialise toute la quête, y compris les sorts, sans effacer les reliques.

## PNJ et mémoire

Oren (porte), Ysilde (place), Borin (forge), Ardel (archives), sergent (poste) : chacun mémorise rencontre, aide accordée, colère, menaces cumulées et excuses.

Les habitants refusent leurs services après une menace ; des excuses rétablissent la coopération, sans effacer le souvenir. Une deuxième menace provoque une dénonciation et une capture, même après des excuses. Le sergent appelle immédiatement la patrouille si on le menace. Aider Ysilde déclenche des répliques de reconnaissance. Les PNJ reconnaissent les objets déjà montrés ; répéter une demande ne multiplie pas les récompenses.

Chaque capture remet à zéro l’évasion (clou/grille), le contrôle du poste et les étapes du face-à-face. Elle conserve les preuves, les services, les indices, le treuil armé et les sorts dépensés. Aucun objet nécessaire n’est perdu définitivement. La cellule dispose toujours du même passage ; seule l’échéance générale peut interrompre l’évasion.

## Trois sorts, deux écrans chacun

Disponibles uniquement si `ChroniclesInventory.owns('grimoire_runique')`, relique remise à la victoire de l’épisode IV. Chaque sort dispose d’**une charge par partie**, et non par pièce ou par capture. Un sort lancé est consommé même si son effet est défavorable. Hors des deux lieux prévus, il est retenu sans coût ni consommation.

| Sort | Écran favorable | Écran défavorable |
| --- | --- | --- |
| Lumière | Archives : lancement 1, lecture 1 au lieu de 5 ; gain net 3. Il faut toujours montrer le jeton et lire. | Poste : les archers repèrent le halo ; sort 1 + transfert en geôle 4. Le danger lumineux est annoncé. |
| Boule de feu | Tour : lancement 1, treuil 1 au lieu de 5 ; gain net 3. Il faut toujours tourner le treuil. | Forge : les soufflets secs s’embrasent ; 4 actions au total, colère de Borin, excuses nécessaires. Contre Edran : son amulette écarlate absorbe la flamme ; le sort et une action sont perdus. |
| Manipulation mentale | Poste : lancement 1, contrôle 1 au lieu de 3 ou 5 ; gain net 1 ou 3. Manteau et mot toujours requis. | Trône : le médaillon renvoie le sort ; sort 1 + transfert en geôle 4. Le portrait prévient de ce danger. |

## Parcours de référence

```text
montrer le mandat à Oren
nord
donner le pain à Ysilde
ouest
montrer le jeton à Borin
verser l’eau sur les entraves
est
est
montrer le jeton à Ardel
lire
lire
lire
lire
lire
ouest
mettre le manteau
nord
dire la pierre se souvient
nord
examiner le portrait
examiner la tapisserie
ouest
tourner le treuil
est
nord
accuser le régent
tirer le levier rouge
jeter le manteau sur le médaillon
mettre les entraves au régent
```

## Validation

`node tests/episode5.test.cjs` : parcours sans magie et avec magie, six effets des sorts, absence de grimoire, consommations, captures répétées, évasion et récupération, mémoire/excuses, prérequis, synonymes, relève, avertissements, échéance exacte et dépassement par action longue, mort en geôle, neuf images distinctes, vignette d’ouverture et balises Umami.
