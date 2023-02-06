### npm project

 * `fnm use 16`
 * `npm ci`

... and the scripts should work

 * `npm run watch`

... for the frontend

 * `npm run lint`
 * `npm test`

... before committing.


### building raw data

 * load `export.lua` into the clipboard: `echo $(<extract/export.lua) | xclip -selection clipboard`
 * run it with \`'s `/c`, it will hang for ~10 seconds and write a bunch of `.rec` files to `~/ins/factorio-1-1-76/script-output`
 * `scripts/load-recs.ts ~/ins/factorio-1-1-76/script-output` will print `data/data.json`
