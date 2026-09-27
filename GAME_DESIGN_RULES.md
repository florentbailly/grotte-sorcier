# Règles de conception des nouveaux épisodes

Ces règles s'appliquent à tous les épisodes créés après l'épisode IV. Elles complètent les règles éditoriales et techniques de `README_DEPLOIEMENT.md`.

L'objectif est de conserver l'ambiance et l'accessibilité des premiers chapitres tout en donnant au joueur davantage de liberté, de conséquences et de raisons de rejouer. Les mécaniques doivent rester lisibles : elles servent l'aventure et ne doivent pas transformer le jeu en tableau de gestion.

## Choisir les mécaniques au service du scénario

Correction éditoriale du 27 septembre 2026 : les douze pistes ci-dessous constituent une boîte à idées, pas un contrat cumulatif. Aucune quête ne doit toutes les intégrer. Les formulations prescriptives des sections suivantes ne s'appliquent que lorsqu'une mécanique est retenue. Privilégier l'exploration, les objets concrets, des indices compréhensibles et des réponses déterministes, dans l'esprit des épisodes I à IV.

Pour l'épisode V (réécriture « capture du régent »), une seule résolution par épreuve. Conserver des PNJ avec mémoire, une échéance létale annoncée de 50 actions, des captures suivies d'une évasion toujours possible avant cette échéance, et trois sorts facultatifs à usage unique débloqués par l'épisode IV. Chaque sort possède des contextes intentionnels, favorables ou défavorables, sans remplacer la solution de l'énigme ; une cible importante protégée doit réagir au sort au lieu de produire une commande incomprise. Pas de jauges de suspicion/corruption, de solutions alternatives ni d'appel LLM. Le détail et les exceptions propres à cet épisode sont dans `EPISODE5_SCENARIO.md` ; ils priment sur les exemples facultatifs ci-dessous.

## Descriptions et propositions sans solution

Règles obligatoires pour les prochaines quêtes : décrire les lieux, personnages, objets et dangers observables sans indiquer le geste à effectuer ni l'objet à employer. Le joueur doit déduire la solution ; les indices précis se découvrent par examen ou dialogue. L'objectif affiché reste une mission, pas une liste d'étapes résolues. Aucun conseil automatique ne doit recopier l'aide.

Les boutons proposent seulement des verbes génériques (Examiner…, Parler…, Prendre…, Utiliser…) qui préremplissent le champ sans exécuter de commande, ainsi que les directions réellement accessibles. Ils ne nomment ni cible ni objet de résolution. Une aide explicite reste possible uniquement à la demande du joueur par INDICE.

## Enseignements de réalisation à conserver

### Coût d'action perceptible

Une tâche longue ne doit pas consommer plusieurs actions en secret sur une seule commande si elle peut devenir une scène jouable. Décomposer une lecture, une fouille ou un rituel en commandes répétées : chaque action coûte un tour, révèle une information nouvelle et modifie la description. Un sort ou un outil accélérateur peut achever en une action le travail restant sans effacer les fragments déjà découverts.

Fixer une échéance après avoir mesuré le parcours canonique sans avantage hérité. Conserver une marge d'exploration cohérente avec les promesses du scénario et, si la capture est présentée comme récupérable, assez de temps pour au moins une capture, l'évasion et le retour sur la route. Tester la victoire exactement à la limite, la mort un tour plus tard et une conséquence qui franchit le seuil.

### Compréhension des commandes

Le parseur reconnaît une intention composée du verbe, de la cible, du lieu, des objets possédés et des prérequis. Il normalise accents, apostrophes, traits d'union et ligatures françaises (`œ`/`oe`). Il comprend infinitif, impératif, première personne, construction « faire + infinitif » et synonymes naturels.

Employer des limites de mots pour les termes courts : `eau` ne doit jamais être détecté dans `manteau`. Traiter les interactions spécifiques avant les verbes généraux comme « mettre » ou « utiliser ». Pour une agression ayant une conséquence, couvrir les familles attaquer, frapper, poignarder, blesser, assommer, charger, étrangler et utiliser une arme contre la cible.

### Texte fidèle à l'état

Toute phrase est construite à partir de l'état réel. Ne jamais annoncer qu'un objet absent est caché, porté, perdu, consommé ou confisqué. Générer les listes, accords singulier/pluriel et conjonctions à partir des objets effectivement possédés. Une action déjà accomplie reçoit une réponse cohérente et ne duplique ni objet ni récompense.

### Capacités héritées et mode d'essai

Les reliques et capacités sont débloquées par l'inventaire permanent, mais leurs charges appartiennent à la partie courante. Une capture ne recharge pas un sort ; recommencer la quête le fait. Un sort pertinent mais inefficace contre une protection est accepté, produit une conséquence claire et peut être consommé. Un sort sans cible pertinente peut être retenu sans coût.

Prévoir, lorsqu'il est utile pour les essais, un mode local clairement signalé qui active les capacités héritées sans écrire de relique, d'issue ou de victoire dans la sauvegarde. Tester victoire, mort et redémarrage dans ce mode.

### Climax et interface

Une confrontation majeure comporte plusieurs changements d'état lisibles plutôt qu'une unique commande finale : établir la preuve ou l'autorité, isoler l'adversaire, neutraliser sa protection, accomplir l'objectif. Après chaque étape, décrire la nouvelle situation sans annoncer automatiquement la commande suivante.

L'illustration et le journal de commandes restent prioritaires. Le panneau latéral ne répète ni la mission ni le tutoriel : conserver seulement les informations tactiques présentes (temps restant, capacités, inventaire, carnet défilable). Vérifier avec un inventaire et un carnet pleins que ce panneau n'allonge pas la rangée de l'image et ne crée pas de grand vide noir, sur ordinateur comme sur mobile.

### Son, test et publication

Lorsque la série l'impose, son et musique sont actifs par défaut, audibles sans saturation et désactivables par le contrôle commun. Toute modification transversale du volume doit être appliquée et vérifiée dans chaque épisode.

Maintenir le moteur déterministe testable sans DOM. Couvrir le parcours sans avantage, le parcours accéléré, les emplois utiles et nuisibles des capacités, les formulations naturelles, les collisions de mots, les menaces et attaques, la capture répétée, l'évasion, les limites temporelles, l'isolation de la sauvegarde, les délais de huit secondes et le comportement des boutons de suggestion.

## Exemples à sélectionner, sans quotas obligatoires

Ces exemples sont facultatifs et ne définissent aucun minimum par épisode :

- deux obstacles importants ayant chacun au moins trois solutions réellement différentes ;
- un PNJ doté d'une attitude, d'une mémoire et de conditions de confiance ;
- une horloge fondée sur le nombre d'actions et au moins un événement déclenché par celle-ci ;
- deux à quatre jauges pertinentes parmi le bruit, la lumière, la suspicion, la corruption ou une jauge propre à l'épisode ;
- un objet ayant plusieurs usages, dont au moins un usage qui le sacrifie ou ferme une possibilité ;
- une énigme d'observation dont les indices découverts sont conservés dans un carnet ;
- une transformation durable d'au moins un lieu après une décision du joueur ;
- un dilemme sans solution parfaite qui modifie la conclusion ou un état partagé entre les quêtes ;
- une scène de tension résolue en un nombre limité d'actions ;
- au moins une fausse piste équitable ;
- au moins un échec qui poursuit l'histoire par une branche plus difficile au lieu de provoquer une mort ou un rechargement.

Toutes ces mécaniques doivent être annoncées ou rendues déductibles par les descriptions. Une mort instantanée est réservée aux dangers clairement signalés.

## 1. Obstacles à plusieurs solutions

Une difficulté majeure ne doit pas dépendre d'un unique objet ou d'une commande exacte. Le joueur peut élaborer une approche : diversion, déguisement, négociation, infiltration, force, observation, magie ou combinaison d'actions.

Chaque solution doit avoir un coût ou une conséquence distincte : temps consommé, bruit, blessure, objet perdu, dette envers un PNJ, hausse de suspicion, corruption ou modification d'une scène ultérieure. Les commandes libres et leurs synonymes doivent être reconnus dès lors que l'intention est claire et compatible avec l'état du jeu.

## 2. PNJ dotés d'une mémoire

Chaque PNJ important possède une fiche cachée contenant :

- sa personnalité et sa manière de parler ;
- ce qu'il sait réellement ;
- ce qu'il croit à tort et les mensonges qu'il peut raconter ;
- ses objectifs, ses peurs et ses relations ;
- son attitude envers le héros ;
- les faits, preuves ou services nécessaires pour qu'il révèle chaque information.

Le PNJ se souvient au minimum des promesses, menaces, mensonges découverts, services rendus, objets montrés et informations déjà révélées. Sa réaction doit tenir compte de cette mémoire. La confiance ne doit jamais augmenter seulement parce que le joueur répète la même demande.

## 3. Temps et événements

Le temps avance par actions significatives, et non en secondes, sauf choix exceptionnel de mise en scène. Examiner plusieurs fois le même élément peut faire perdre du temps si le joueur en a été averti.

Les événements programmés doivent être cohérents et perceptibles : relève des gardes, extinction d'une torche, ouverture d'une porte, déplacement d'un PNJ ou aggravation d'un danger. Des avertissements progressifs permettent au joueur de comprendre qu'une échéance approche.

## 4. Bruit, lumière, suspicion et corruption

Les jauges choisies doivent avoir peu de paliers lisibles, avec des effets concrets : calme/repéré/alerte, obscur/pénombre/exposé, crédible/suspect/démasqué, intact/marqué/corrompu.

Une action peut améliorer une jauge et en dégrader une autre. Allumer une torche facilite l'observation mais révèle la présence du héros ; employer une magie noire résout un problème immédiat mais altère des descriptions, des relations ou une quête future. Le joueur doit recevoir un retour narratif quand une jauge change ou franchit un seuil.

## 5. Objets à usages multiples

Un objet important ne correspond pas à une serrure unique. Il doit avoir plusieurs usages logiques dans des contextes différents. Le moteur reconnaît l'intention et valide les contraintes du monde.

Un objet coupé, abandonné, donné, brisé ou consommé change d'état dans l'inventaire partagé. Cette décision doit fermer certaines possibilités et peut en ouvrir d'autres. Les épisodes suivants doivent lire cet état sans recréer automatiquement l'objet perdu.

## 6. Observation et carnet d'indices

Les énigmes reposent aussi sur les informations découvertes : détails visuels, contradictions, sons, comportements, symboles ou absence anormale d'un phénomène.

Le carnet automatique ne contient que les indices effectivement observés. Il enregistre des faits, pas leur solution, et peut rapprocher plusieurs observations sans effectuer la déduction à la place du joueur. Toute énigme doit pouvoir être résolue à partir des indices disponibles, sans connaissance extérieure arbitraire.

## 7. Monde réactif

Après une décision importante, mettre à jour les descriptions, déplacements possibles, comportements des PNJ et dangers concernés. Un lieu déjà visité doit refléter l'alerte déclenchée, un brasier éteint, une malédiction emportée ou un allié libéré.

Les changements durables utiles aux épisodes suivants sont enregistrés dans un état partagé versionné, comme l'inventaire multi-quêtes. Une migration ou une valeur par défaut doit préserver les anciennes sauvegardes.

## 8. Dilemmes et conséquences inter-quêtes

Au moins un choix important ne possède pas de solution parfaite. Ses conséquences doivent apparaître dans l'écran final et, si elles sont durables, dans le village ou un épisode ultérieur.

La conclusion récapitule les personnes sauvées ou perdues, les promesses tenues, les objets conservés, les marques subies et les voies qui auraient pu exister, sans juger artificiellement une seule fin comme la bonne.

## 9. Scènes de tension

Une poursuite, une fouille, un duel verbal, un rituel ou un effondrement peut limiter le joueur à quelques actions. Chaque action produit une réaction claire et rapproche la scène de son issue.

Le joueur doit connaître l'urgence et disposer de plusieurs décisions plausibles. Une hésitation peut mener à une capture, une perte ou une nouvelle branche plutôt qu'à une mort systématique.

## 10. Fausses pistes équitables

Une fausse piste doit être explicable après coup grâce à un indice observable. Elle apporte néanmoins quelque chose : information secondaire, révélation sur un PNJ, coût de temps, danger annoncé ou solution efficace mais moralement douteuse.

Elle ne doit jamais reposer sur une différence de vocabulaire arbitraire ni invalider rétroactivement des faits établis.

## 11. Échec qui fait avancer l'histoire

Privilégier les conséquences jouables : capture et évasion, confiscation, blessure temporaire, perte de confiance, hausse d'alerte ou route plus difficile. Le moteur conserve la trace de l'échec et adapte la suite.

La mort reste possible pour un piège explicitement létal, une répétition consciente d'un danger ou l'épuisement des dernières possibilités pendant une scène critique. Comme pour la victoire, laisser huit secondes pour lire le dernier résultat avant d'afficher la fenêtre finale.

## 12. PNJ conversationnels avec l'API OpenAI

L'IA sert à comprendre une proposition formulée librement et à produire la réponse du personnage. Le moteur déterministe demeure seul responsable de la vérité du monde et de toute mutation de l'état.

Flux obligatoire :

1. Le navigateur envoie la réplique du joueur et un état minimal à une route serveur sécurisée.
2. Le serveur ajoute la fiche cachée du PNJ et demande une réponse structurée au modèle.
3. Le modèle retourne l'intention comprise, les preuves ou objets évoqués, la réplique du PNJ et des changements proposés.
4. Le moteur vérifie l'inventaire, les faits connus, les seuils de confiance, les limites de révélation et les conséquences autorisées.
5. Seuls les changements validés sont appliqués ; la réponse affichée est corrigée ou remplacée si elle contredit le monde.

Le modèle ne peut jamais inventer un objet possédé, révéler un secret verrouillé, décider seul d'une réussite, modifier une jauge ou écrire directement dans la sauvegarde. Les sorties doivent suivre un schéma structuré avec des identifiants connus du moteur, par exemple : intention, identifiants d'objets cités, faits révélés proposés, variation d'attitude proposée et texte de réponse.

La clé API OpenAI est un secret serveur. Elle ne doit figurer ni dans les fichiers HTML/JavaScript publics, ni dans `localStorage`, ni dans le dépôt Git. L'appel passe par un petit service serveur ou une fonction en périphérie avec limitation de débit, délai maximal et journalisation sans données sensibles.

La quête doit rester jouable si l'API est indisponible : les commandes classiques et les formulations fréquentes passent par un analyseur local ; les conversations reçoivent une réponse de secours cohérente. Envoyer au modèle uniquement la fiche utile, l'état minimal validé et un résumé court de la mémoire, jamais toute la sauvegarde ni tout l'historique.

## État partagé recommandé

L'état multi-quêtes doit être versionné et distinguer :

- les objets et leur état (`intact`, `consommé`, `donné`, `brisé`) ;
- les indices réellement découverts ;
- la mémoire et l'attitude des PNJ ;
- les jauges temporaires de l'épisode ;
- les décisions durables et leurs conséquences ;
- les blessures, dettes, alliances et marques persistantes.

Les identifiants internes restent stables et ne dépendent pas du texte affiché. Toute nouvelle version prévoit des valeurs par défaut afin de ne pas casser une partie existante.

## Validation avant publication

Avant de publier un épisode, vérifier :

- chaque solution annoncée, avec plusieurs formulations naturelles ;
- les conséquences et changements de description de chaque branche ;
- tous les seuils d'horloge et de jauges ;
- la perte, le sacrifice et la persistance des objets ;
- la mémoire, les mensonges et les limites de révélation des PNJ ;
- la résolution des énigmes avec seulement les indices découverts ;
- les fausses pistes et l'explication permettant de les reconnaître ;
- les branches d'échec continuant l'histoire ;
- le mode de secours sans API ;
- l'absence de clé ou de secret dans les fichiers servis ;
- la compatibilité des anciennes sauvegardes ;
- le délai de huit secondes avant toute fenêtre de victoire ou de mort ;
- la vignette d'ouverture non révélatrice et la conservation exacte des balises Umami.

