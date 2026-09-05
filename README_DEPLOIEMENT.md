# La Grotte du Sorcier de Givre

Jeu d'aventure statique en HTML, CSS et JavaScript. Aucun serveur Node.js, aucune base de données et aucune compilation ne sont nécessaires.

## Contenu

- `index.html` : page du jeu
- `styles.css` : interface et rendu rétro
- `game.js` : moteur, énigmes et progression
- `assets/` : illustrations CGA

## Installation sur le VPS

1. Décompresser l'archive dans un répertoire web, par exemple :

   ```bash
   sudo mkdir -p /var/www/grotte-sorcier
   sudo unzip grotte-sorcier-vps.zip -d /var/www/grotte-sorcier
   ```

2. Donner au serveur web l'accès en lecture :

   ```bash
   sudo chown -R www-data:www-data /var/www/grotte-sorcier
   ```

## Configuration Caddy

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

## Configuration Nginx

Créer un hôte avec cette configuration :

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

Après activation du site, vérifier puis recharger Nginx :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Le jeu fonctionne entièrement dans le navigateur. HTTPS peut être géré directement par Caddy ou par Certbot avec Nginx.
