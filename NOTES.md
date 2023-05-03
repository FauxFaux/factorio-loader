```
cd ~/clone/factorio-rust-tools
cargo run --release -- --factorio-dir ~/ins/factorio-1-1-76 export ~/ins/factorio-1-1-76/mods/* | tee a.json
(a.json is crap/rust-tools-export-76.json)
<a.json jq keys
jq .recipe_prototypes a.json > recp-full.json
jq .item_prototypes a.json > items.json
jq .fluid_prototypes a.json > f.json
<recp-full.json jq -cS 'map({ (.name): { localised_name, category, ingredients, products, category } }) | add' > ~/code/factorio-loader/data/recipes.json
<items.json jq -cS 'with_entries(.value |= { type, localised_name, stack_size, wire_count, group, subgroup })' > ~/code/factorio-loader/data/items.json
<f.json jq -Sc 'with_entries(.value |= { type, localised_name, group, subgroup })' > ~/code/factorio-loader/data/fluids.json
jq -c '.icons|map({key:.id, value:.position})|from_entries' script-output/factoriolab-export/data.json > data/icons.json
```

 * https://wiki.factorio.com/Prototype_definitions
 * mining-drill includes: > This prototype type is used by burner mining drill, electric mining drill and pumpjack in vanilla.

 * https://wiki.factorio.com/Console#Delete_unrevealed_chunks

```lua
game.player.surface.always_day=true
game.player.force.character_inventory_slots_bonus=100
game.player.teleport(game.player.selected.position)
game.player.cheat_mode=true
game.player.insert({name="construction-robot-ht", count=500})
game.player.selected.insert({name="nylon",count=9000})
```

```lua
local surface = game.player.surface
local force = game.player.force
for chunk in surface.get_chunks() do
  if not force.is_chunk_charted(surface, chunk) then
    surface.delete_chunk(chunk)
  end
end
```


### blueprints

inventory contains just one blueprint book
```
/c print(game.player.get_inventory(defines.inventory.character_main)[1].get_inventory(defines.inventory.chest).insert({name="blueprint",count=10}))
/c print(game.player.get_inventory(defines.inventory.character_main)[1].get_inventory(defines.inventory.chest)[1].create_blueprint({surface=game.player.surface, force=game.player.force, area={left_top={-94,-596}, right_bottom={-31,-555}}}))
```


### screenshots

 * run the top hunk of screenshots.lua manually in the console
 * wait ~4 minutes
 * run `faux@astoria:~/code/tiledir% rm -rf out; RUST_LOG=info nice cargo run --release ~/ins/factorio/script-output -s 7 -q 80`
 * wait ~30 minutes
 * `rsync -a out/ fau.xxx:tiledir`
 * wait ~10 minutes
 * `faux@sek:/srv/facto.goeswhere.com%`
 * `mv map-tiles map-tiles-$(date +%Y%m%d%H%M%S)`
 * `mv ~/tiledir map-tiles && chmod a+rX -R map-tiles`
 * update the version number in `leafletMap`

* sodium hydroxide provide

* empty barrel request
* ammonia request
* benzene request

 * hydrogen chloride provide

 * nylon provide

moss stone vs. coarse
https://facto.goeswhere.com/#/an/plan/G94AYI3UYs0Z7mTkttQ_Y1Y6cWaYNW6ho5MDvPK3i0UcSJgnkUaSh5jH2HM-BhI_vP9AfjzOzJcD9vN90xoJzKP8Nx9hvJyzaBIEszHEhOhTvKTmVM_rBEpV5qzSVxleoOQq9XyWZqX7-aLqsowsAg
https://facto.goeswhere.com/#/an/plan/G94AgIzUYs0Z7mTLLfXPEMYtWLrRMyiiR1B2w7Zb6OjkAFMthqQsDNsi6ZpB6HmMHTlHCokBiz9sA93UmwFvZLKAoP24f_-etZldqIR8TpRlkkAn6Zwf0FEZkKdHC8Z-gEyktIbwJ60TVec-AQ
