# Les Chroniques des Terres Obscures — épisodes I à V

Les cinq jeux fonctionnent sans compilation, entièrement dans le navigateur. L’épisode V réécrit fonctionne sans API ni LLM, avec des dialogues déterministes.

## Contenu

- `index.html` : village en ruine et sélecteur de quête
- `episode1.html` : épisode I — La Grotte du Sorcier de Givre
- `episode2.html` : épisode II — Le Château du Seigneur des Ténèbres
- `episode3.html` : épisode III — La Forêt de l’Ombre Sans Nom
- `episode4.html` : épisode IV — La Montagne du Dragon Noir
- `episode5.html` : épisode V — La Cité du Traître Blafard
- `game.js`, `episode2.js`, `episode3.js`, `episode4.js` et `episode5.js` : moteurs et intrigues des cinq épisodes
- `npc-conversation.js` : appel facultatif au service conversationnel, avec repli local automatique
- `server/npc-dialogue-worker.mjs` : route serveur de référence pour l’API OpenAI ; la clé reste exclusivement dans `OPENAI_API_KEY`
- `chronicles.js` : inventaire persistant partagé entre les quêtes
- `styles.css` : interface commune
- `assets/` : toutes les illustrations CGA

La musique des épisodes est synthétisée directement par le navigateur. Aucun fichier audio supplémentaire n'est nécessaire. Les cinq épisodes utilisent un niveau sonore renforcé tout en conservant le bouton commun « Son + musique ».

### Épisode V réécrit

Le scénario est décrit dans `EPISODE5_SCENARIO.md`. `episode5-core.js` contient le moteur indépendant de l'interface ; `episode5.js` gère son affichage. Objectif : capturer le régent vivant en 50 actions au maximum. Les PNJ mémorisent services et menaces ; une capture mène à une geôle dont on peut s'évader. L'arrivée des renforts sans arrestation provoque la mort. Les trois sorts hérités de l'épisode IV ont chacun une utilisation par partie et deux lieux d'emploi aux effets opposés. Neuf décors originaux `e5-v3-*` remplacent toutes les images réutilisées dans l'épisode V.

`npc-conversation.js` et `server/npc-dialogue-worker.mjs` sont des prototypes historiques non chargés par l'épisode V. Aucun service ni clé n'est nécessaire. Vérification : `node tests/episode5.test.cjs`.

## Règles pour les prochaines quêtes

Les mécaniques, conséquences, PNJ conversationnels et critères de validation des nouveaux épisodes sont définis dans `GAME_DESIGN_RULES.md`. Ce document doit être lu avant toute création ou modification d'une future quête.

Sur `index.html`, la vignette d’une quête doit toujours reprendre sa première scène jouable ou son image d’ouverture. Elle ne doit jamais révéler un lieu, un adversaire ou un événement découvert plus tard dans l’aventure, en particulier la scène finale.

Les balises de suivi Umami déjà présentes dans les fichiers HTML doivent être conservées à l’identique lors de toute modification. Chaque nouvelle page de quête doit également inclure la même balise `<script>` avec son adresse `src`, son attribut `defer` et son `data-website-id` existants, sans doublon.

## Déploiement sur le VPS

Décompresser l'archive dans le répertoire servi par votre serveur web :

```bash
sudo mkdir -p /var/www/grotte-sorcier
sudo unzip grotte-sorcier-episodes-1-2-vps.zip -d /var/www/grotte-sorcier
sudo chown -R www-data:www-data /var/www/grotte-sorcier
```

## Avec Caddy

Ajouter au `Caddyfile` :

```caddyfile
jeu.votre-domaine.fr {
    root * /var/www/grotte-sorcier
    file_server
}
```

Puis recharger Caddy :

```bash
sudo systemctl reload caddy
```

## Avec Nginx

```nginx
server {
    listen 80;
    server_name jeu.votre-domaine.fr;
    root /var/www/grotte-sorcier;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Après activation de la configuration :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Le village et le sélecteur de quête sont accessibles à la racine du site. Dans chaque aventure, le bouton « Retour au village » permet de revenir au choix des épisodes.

Test isolé des sorts de l'épisode V : `episode5.html?testSorts=1`. Trois charges disponibles, aucune écriture dans l'inventaire ou la progression permanente. Retirer le paramètre pour revenir au jeu normal. Tests interface : `node tests/episode5-ui.test.cjs`.
