// -1360.5,-557.5 -> -1166.5,-432.5

use std::fs;

use anyhow::Result;

mod parse;

fn main() -> Result<()> {
    for arg in std::env::args_os().skip(1) {
        let content = fs::read_to_string(&arg)?;
        println!("{:#?}", parse::parse(&content));
    }
    Ok(())
}
