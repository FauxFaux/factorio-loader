use std::collections::HashMap;

use anyhow::{anyhow, bail, Result};
use nom::branch::alt;
use nom::bytes::complete::{escaped, tag, take_until};
use nom::character::complete::{alpha1, anychar, char, digit1, multispace0, one_of};
use nom::combinator::{map, map_res, not, opt, recognize};
use nom::multi::{many0, separated_list0};
use nom::sequence::{delimited, pair, terminated, tuple};
use nom::{IResult, Parser};

type Table = Vec<(Option<String>, Value)>;

#[derive(Debug, PartialEq)]
pub enum Value {
    Object(Table),
    String(String),
    Float(f64),
}

// atom: number or string
// table: { (label? value), * }
// value = atom | table

fn num(input: &str) -> IResult<&str, Value> {
    let (rest, v) = recognize(tuple((
        opt(char('-')),
        digit1,
        opt(tuple((char('.'), digit1))),
    )))(input)?;
    Ok((rest, Value::Float(v.parse::<f64>().expect("close enough"))))
}

fn string(input: &str) -> IResult<&str, Value> {
    map(
        delimited(char('"'), many0(one_of("hello")), char('"')),
        |v| Value::String(v.into_iter().collect()),
    )(input)
}

fn atom(input: &str) -> IResult<&str, Value> {
    alt((num, string))(input)
}

fn maybe_named_value(input: &str) -> IResult<&str, (Option<&str>, Value)> {
    pair(opt(terminated(alpha1, char('='))), value)(input)
}

fn table(input: &str) -> IResult<&str, Value> {
    map(
        delimited(
            char('{'),
            separated_list0(char(','), maybe_named_value),
            char('}'),
        ),
        |pairs| {
            Value::Object(
                pairs
                    .into_iter()
                    .map(|(s, v)| (s.map(|s| s.to_string()), v))
                    .collect(),
            )
        },
    )(input)
}

fn value(input: &str) -> IResult<&str, Value> {
    alt((atom, table))(input)
    // let (rest, val) = delimited(char('{'), many0(
    //     obj
    // ), char('}'))(input)?;
}

pub fn parse(s: &str) -> Result<Table> {
    match value(s).expect("TODO: parse errors") {
        ("", Value::Object(t)) => Ok(t),
        (rest, Value::Object(_)) => bail!("unexpected trailing data: {rest:?})"),
        _ => bail!("unexpected non-object"),
    }
}

#[cfg(test)]
mod tests {
    use crate::parse::{parse, Table, Value};
    use std::collections::HashMap;

    #[test]
    fn simple() {
        assert_eq!(Table::new(), parse("{}").unwrap());
        assert_eq!(
            vec![(Some("a".to_string()), Value::Float(5.))],
            parse("{a=5}").unwrap()
        );

        assert_eq!(
            vec![(Some("abc".to_string()), Value::Float(5.))],
            parse("{abc=5}").unwrap()
        );

        assert_eq!(
            vec![(Some("a".to_string()), Value::Float(5.5))],
            parse("{a=5.5}").unwrap()
        );
        assert_eq!(
            vec![(Some("a".to_string()), Value::String("hello".to_string()))],
            parse("{a=\"hello\"}").unwrap()
        );
        assert_eq!(
            vec![
                (Some("a".to_string()), Value::Float(5.)),
                (Some("b".to_string()), Value::Float(6.))
            ],
            parse("{a=5,b=6}").unwrap()
        );
    }
}
