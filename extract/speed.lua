local surface = game.player.surface
local mgs = surface.map_gen_settings
mgs.autoplace_controls["enemy-base"].size = "none"
surface.map_gen_settings = mgs

for _, entity in pairs(surface.find_entities_filtered({ force = "enemy" })) do
    entity.destroy()
end

local surface = game.player.surface
for _, v in pairs(surface.find_entities_filtered({ type = "inserter" })) do
    local d = v.drop_target
    if d ~= nil then
        if d.name == "gun-turret" then
            v.destroy()
        end
    end
end

for _, v in pairs(surface.find_entities_filtered({ type = "ammo-turret" })) do
    v.destroy()
end
for _, v in pairs(surface.find_entities_filtered({ type = "electric-turret" })) do
    v.destroy()
end
for _, v in pairs(surface.find_entities_filtered({ type = "fluid-turret" })) do
    v.destroy()
end

game.player.surface.clear_pollution()
game.map_settings.pollution.enabled = false

game.player.surface.destroy_decoratives({})

game.player.character_running_speed_modifier = 2
game.speed = 3
