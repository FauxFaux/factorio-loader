### npm project

 * `fnm use 18`
 * `npm ci`

... and the scripts should work

 * `npm run watch`

... for the frontend

 * `npm run lint`
 * `npm test`

... before committing.


### building raw data

 * load `export.lua` into the clipboard: `echo $(<extract/export.lua) | xclip -selection clipboard`
 * run it with \`'s `/c`, it will hang for ~10 seconds and write a bunch of `.rec` files to `~/ins/factorio/script-output`
 * `scripts/load-recs.ts ~/ins/factorio/script-output` will print `data/data.json`


### License

Code here is MIT, but be aware that the process-mgmt library (used in some places) is GPL.
