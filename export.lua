for _, ty in ipairs({
    "assembling-machine",
    "straight-rail", "curved-rail",
    "assembling-machine",
    "train-stop",
    "loader",
    "inserter",
    "roboport",
    "radar",
    "container",
    "train-stop-input",
    "tags" }) do
    local all
    if ty == "tags" then
        all = game.player.force.find_chart_tags('nauvis')
    elseif ty == "train-stop-input" then
        all = game.get_surface('nauvis').find_entities_filtered({ name = "logistic-train-stop-input" })
    else
        all = game.get_surface('nauvis').find_entities_filtered({ type = ty })
    end
    local t = {};
    for _, v in pairs(all) do
        local a = { v.position.x, v.position.y };
        if ty == "tags" then
            a[#a + 1] = 0
            a[#a + 1] = v.text
        else
            a[#a + 1] = v.direction
            a[#a + 1] = v.name
        end
        if ty == "assembling-machine" then
            pcall(function()
                a[#a + 1] = v.get_recipe().name
            end)
        end
        if ty == "train-stop" then
            a[#a + 1] = v.backer_name
        end
        if ty == "train-stop-input" then
            for name, def in pairs({green = defines.wire_type.green, red = defines.wire_type.red}) do
                a[#a + 1] = name
                for _, s in pairs(v.get_circuit_network(def).signals) do
                    a[#a + 1] = s.signal.type
                    a[#a + 1] = s.signal.name
                    a[#a + 1] = s.count
                end
            end
        end
        t[#t + 1] = table.concat(a, "\036")
    end
    game.write_file(ty .. ".rec", table.concat(t, "\035"))
end
