// -1360.5,-557.5 -> -1166.5,-432.5
// (367+1360.5)/9 = 192
// (722+557.5)/10 = 128
// 192x128 apparently, makes sense with the 32 divisor
// top left cell starts at -1360.5,-557.5, which is -7, (-557+47)/128=-4 (-7,-4); next row down is (-6.5,-3)

// top left of the ship cell, which isn't visible, would be (-14,-47); this is our origin
// minus numbers are up and to the left (north west)
// positive numbers are down and to the right (south east)

use std::fs;
use std::path::Path;

use crate::parse::Value;
use anyhow::{anyhow, bail, Context, Result};

mod parse;

#[derive(Copy, Clone, Debug)]
struct Pos {
    x: f64,
    y: f64,
}

#[derive(Clone, Debug)]
struct Tag {
    text: String,
    pos: Pos,
}

#[derive(Debug, Clone)]
struct Npd {
    name: String,
    pos: Pos,
    direction: u8,
}

impl Pos {
    fn try_from(val: Value) -> Result<Pos> {
        Ok(Pos {
            x: val.get("x")?.f64()?,
            y: val.get("y")?.f64()?,
        })
    }
}

impl Tag {
    fn try_from(val: Value) -> Result<Tag> {
        Ok(Tag {
            text: val.get("text")?.string()?,
            pos: Pos::try_from(val.get("position")?)?,
        })
    }
}

impl Npd {
    fn try_from(val: Value) -> Result<Npd> {
        Ok(Npd {
            name: val.get("name")?.string()?,
            pos: Pos::try_from(val.get("position")?)?,
            direction: val.get("direction")?.f64()? as u8,
        })
    }
}

fn main() -> Result<()> {
    for arg in std::env::args_os().skip(1) {
        let content = fs::read_to_string(&arg)?;
        let list = parse::parse(&content)?;
        match Path::new(&arg)
            .file_stem()
            .unwrap()
            .to_string_lossy()
            .as_ref()
        {
            "tag" => {
                for (_, row) in list {
                    println!("{:?}", Tag::try_from(row)?);
                }
            }
            _ => {
                for (_, row) in list {
                    println!(
                        "{:?}",
                        Npd::try_from(row.clone()).with_context(|| anyhow!("{row:?}"))?
                    );
                }
            } // other => bail!("unrecognised file-name: {other:?}"),
        }
    }
    Ok(())
}
