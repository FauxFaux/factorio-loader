function tlen(T)
    local count = 0
    for _ in pairs(T) do
        count = count + 1
    end
    return count
end
for _, ty in ipairs({
    "assembling-machine",
    "mining-drill",
    "boiler",
    "furnace",
    "lab",
    "container",
    "logistic-container",
    "storage-tank",
    "train-stop",
    "roboport",
    "radar",
    "train-stop-input",
    "constant-combinator",
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
            a[#a + 1] = v.unit_number
        end
        if ty == "train-stop-input" then
            for name, def in pairs({ green = defines.wire_type.green, red = defines.wire_type.red }) do
                a[#a + 1] = name
                for _, s in pairs(v.get_circuit_network(def).signals) do
                    a[#a + 1] = s.signal.type
                    a[#a + 1] = s.signal.name
                    a[#a + 1] = s.count
                end
            end
        end
        if ty == "mining-drill" then
            for name, _true in pairs(v.prototype.resource_categories) do
                a[#a + 1] = name
            end
        end
        if ty == "boiler" then
            pcall(function()
                a[#a + 1] = v.mode
            end)
        end
        if ty == "furnace" then
            local prev = v.previous_recipe
            if prev ~= nil then
                a[#a + 1] = prev.name
            end
        end
        if ty == "container" or ty == "logistic-container" then
            local oi = v.get_output_inventory()
            if oi ~= nil then
                for item, count in pairs(oi.get_contents()) do
                    a[#a + 1] = item
                    a[#a + 1] = count
                end
            end
        end
        if ty == "storage-tank" then
            local oi = v.get_fluid_contents()
            if oi ~= nil then
                for item, count in pairs(oi) do
                    a[#a + 1] = item
                    a[#a + 1] = count
                end
            end
        end
        if ty == "constant-combinator" then
            local cb = v.get_control_behavior()
            for _, s in pairs(cb.parameters) do
                if s.signal.name ~= nil then
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
local t = {}
for name, v in pairs(game.player.force.technologies) do
    if v.enabled then
        local a = { name }
        if v.researched then
            a[#a + 1] = 1
        else
            a[#a + 1] = 0
        end
        a[#a + 1] = tlen(v.prerequisites)
        for pre, _ in pairs(v.prerequisites) do
            a[#a + 1] = pre
        end
        for _, eff in pairs(v.effects) do
            if eff.type == "unlock-recipe" then
                a[#a + 1] = eff.recipe
            end
        end
        t[#t + 1] = table.concat(a, "\036")
    end
end
game.write_file("technologies.rec", table.concat(t, "\035"))

local fpi = defines.flow_precision_index
for ty, ps in pairs({ item = game.player.force.item_production_statistics, fluid = game.player.force.fluid_production_statistics }) do
    for _, input in pairs({ true, false }) do
        local t = {}
        local counts
        if input then
            counts = ps.input_counts
        else
            counts = ps.output_counts
        end
        local direction
        if input then
            direction = "input"
        else
            direction = "output"
        end
        for k, v in pairs(counts) do
            local a = { k, v }
            for _, precision in pairs({
                fpi.five_seconds,
                fpi.one_minute,
                fpi.ten_minutes,
                fpi.one_hour,
                fpi.ten_hours,
                fpi.fifty_hours,
                fpi.two_hundred_fifty_hours,
                fpi.one_thousand_hours }) do
                a[#a + 1] = ps.get_flow_count({ name = k, input = input, precision_index = precision })
            end
            t[#t + 1] = table.concat(a, "\036")
        end
        game.write_file(ty .. "-" .. direction .. ".rec", table.concat(t, "\035"))
    end
end
