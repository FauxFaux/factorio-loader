local surface = game.player.surface
local mgs = surface.map_gen_settings
mgs.autoplace_controls["enemy-base"].size = "none"
surface.map_gen_settings = mgs

local surface=game.player.surface
for key, entity in pairs(surface.find_entities_filtered({force="enemy"})) do
    entity.destroy()
end

game.speed=3
