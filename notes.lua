local all = game.get_surface('nauvis').find_entities_filtered({limit=1000}); local t = {}; for k,v in pairs(all) do t[#t+1] = {name=v.name, type=v.type} end; game.write_file("mods.lua", serpent.block(t))
local all = game.entity_prototypes; local t = {}; for k,v in pairs(all) do t[#t+1] = k end; game.write_file("mods.lua", serpent.block(t))
game.write_file("mods.lua", serpent.block(game.entity_prototypes))
local all = game.get_surface('nauvis').find_entities_filtered({limit=10000}); local t = {}; for k,v in pairs(all) do t[#t+1] = {name=v.name, type=v.type} end; game.write_file("mods.lua", serpent.block(t))
-- "underground-belt", "pipe", "transport-belt", "storage-tank", "pipe-to-ground", "splitter",
for _, ty in ipairs({"straight-rail", "curved-rail", "splitter", "assembling-machine", "train-stop", "loader", "inserter", "roboport", "radar", "container"}) do local all = game.get_surface('nauvis').find_entities_filtered({type=ty}); local t = {}; for k,v in pairs(all) do t[#t+1] = {name=v.name, position=v.position, direction=v.direction} end; game.write_file(ty .. ".lua", serpent.block(t)) end
for _, ty in ipairs({"assembling-machine"}) do local all = game.get_surface('nauvis').find_entities_filtered({type=ty}); local t = {}; for k,v in pairs(all) do local a = {name=v.name, position=v.position, direction=v.direction}; if v.get_recipe() ~= nil then a.recipe=v.get_recipe().name end t[#t+1]=a; end; game.write_file(ty .. ".lua", serpent.block(t)) end
local t = {}; for _, tag in pairs(game.player.force.find_chart_tags('nauvis')) do t[#t+1] = { text=tag.text, position=tag.position} end; game.write_file("tag.lua", serpent.block(t))
-- tr $'\x1e' '\t' | tr $'\x1d' '\n'
