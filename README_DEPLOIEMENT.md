# Les Chroniques des Terres Obscures — épisodes I à IV

Les quatre jeux sont entièrement statiques : HTML, CSS et JavaScript exécutés dans le navigateur. Il n'y a ni serveur Node.js, ni base de données, ni compilation à effectuer.

## Contenu

- `index.html` : village en ruine et sélecteur de quête
- `episode1.html` : épisode I — La Grotte du Sorcier de Givre
- `episode2.html` : épisode II — Le Château du Seigneur des Ténèbres
- `episode3.html` : épisode III — La Forêt de l’Ombre Sans Nom
- `episode4.html` : épisode IV — La Montagne du Dragon Noir
- `game.js`, `episode2.js`, `episode3.js` et `episode4.js` : moteurs et intrigues des quatre épisodes
- `chronicles.js` : inventaire persistant partagé entre les quêtes
- `styles.css` : interface commune
- `assets/` : toutes les illustrations CGA

La musique des épisodes est synthétisée directement par le navigateur. Aucun fichier audio supplémentaire n'est nécessaire.

## Règle éditoriale pour les prochaines quêtes

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
