# Marge Studio — Clients et calculateur

Application statique en français pour gérer des clients par ville, suivre les tailles achetées et calculer un prix de vente conseillé. Elle fonctionne sans compte ni serveur applicatif ; les fiches sont conservées dans le `localStorage` du navigateur utilisé.

## Lancer l’application

Décompressez le dossier du projet, ouvrez un terminal dans ce dossier et lancez :

```bash
python3 -m http.server 8000
```

Puis ouvrez `http://localhost:8000` dans votre navigateur. Aucun `npm install` ni accès à un CDN n’est nécessaire pour les fonctions d’import et d’export XLSX : ExcelJS est fourni dans `vendor/`. Une connexion Internet peut seulement être utilisée pour charger les polices Google ; des polices locales de remplacement sont prévues.

## Gérer les clients

Ajoutez un client avec son nom, son numéro, sa ville et les tailles. Les tailles acceptent des lettres, des chiffres ou un mélange, par exemple `38, 40, M, XL`. Elles peuvent être séparées par une virgule, un point-virgule ou une barre oblique. Chaque fiche peut être modifiée ou supprimée ; les données sont sauvegardées automatiquement dans le navigateur.

Pour saisir plusieurs clients, collez des lignes tabulées, ou importez un `.xlsx` ou un `.csv`. Les quatre champs requis sont `Nom`, `Téléphone`, `Ville` et `Tailles`. Une cellule de tailles peut contenir plusieurs valeurs séparées par des virgules. Si elle contient le séparateur de colonnes du CSV (virgule ou point-virgule), entourez toute la cellule de guillemets pour que ses tailles restent dans une seule colonne. Les numéros et tailles sont conservés comme texte lors de l’export.

Le classeur Excel contient une synthèse des villes, un répertoire complet trié par ville, les tailles détaillées par client, une analyse des tailles et un onglet distinct par ville. Il peut aussi être créé avant l’ajout de clients ; le classeur est alors vide. Sur téléphone, une fenêtre propose un lien « Télécharger » et, si le navigateur le prend en charge, le partage pour enregistrer le fichier dans l’app Fichiers. L’export des numéros télécharge uniquement les téléphones, un par ligne, en fichier `.txt`.

Sur téléphone, la navigation passe en haut et les listes clients, villes et projections se transforment en cartes verticales : la page reste limitée à la largeur de l’écran, sans barre de défilement horizontale globale. Sur ordinateur, les tables conservent leur présentation en colonnes.

## Calculateur

L’onglet « Calculateur » conserve la fonction de tarification : coût d’achat de gros, publicité par commande hors TVA, livraison et bénéfice net cible par pièce. La TVA de 20 % s’applique au coût publicitaire ; le calcul suppose une pièce par commande. La devise MAD, EUR ou USD, les projections par quantité, l’ajout/suppression de quantités et la réinitialisation sont disponibles.

## Confidentialité et sauvegarde

Aucune fiche client n’est envoyée à un service externe. `localStorage` est propre au navigateur et au profil de l’appareil : les données ne se synchronisent pas entre appareils et peuvent être perdues si le stockage du navigateur est effacé. Utilisez régulièrement l’export Excel pour conserver une copie ou transférer les fiches. Le bouton « Charger un exemple » remplit seulement la zone de collage ; il n’ajoute aucune fiche tant que vous ne cliquez pas sur « Ajouter les lignes ».

ExcelJS est distribué sous licence MIT ; le texte de sa licence se trouve dans `vendor/EXCELJS-LICENSE.txt`.
