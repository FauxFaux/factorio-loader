use anyhow::{bail, Result};
use nom::branch::alt;
use nom::bytes::complete::{escaped_transform, tag};
use nom::character::complete::{alpha1, char, digit1, multispace0, none_of};
use nom::combinator::{map, opt, recognize};
use nom::multi::separated_list0;
use nom::sequence::{delimited, pair, terminated, tuple};
use nom::IResult;

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

fn ws(input: &str) -> IResult<&str, &str> {
    multispace0(input)
}

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
        delimited(
            char('"'),
            escaped_transform(
                none_of("\\\n\""),
                '\\',
                alt((nom::combinator::value("\"", tag("\"")),)),
            ),
            char('"'),
        ),
        |v: String| Value::String(v),
    )(input)
}

fn atom(input: &str) -> IResult<&str, Value> {
    alt((num, string))(input)
}

fn maybe_named_value(input: &str) -> IResult<&str, (Option<&str>, Value)> {
    pair(
        opt(terminated(
            delimited(ws, alpha1, ws),
            delimited(ws, char('='), ws),
        )),
        delimited(ws, value, ws),
    )(input)
}

fn table(input: &str) -> IResult<&str, Value> {
    map(
        delimited(
            delimited(ws, char('{'), ws),
            separated_list0(delimited(ws, char(','), ws), maybe_named_value),
            delimited(ws, char('}'), ws),
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
    use crate::parse::{parse, string, Table, Value};

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

        assert_eq!(
            vec![(
                None,
                Value::Object(vec![(Some("a".to_string()), Value::Float(5.))])
            )],
            parse("{{a=5}}").unwrap()
        );
    }

    #[test]
    fn escaped_strings() {
        assert_eq!(
            ("", Value::String("hello".to_string())),
            string("\"hello\"").unwrap()
        );
        assert_eq!(
            ("", Value::String("he\"llo".to_string())),
            string("\"he\\\"llo\"").unwrap()
        );
    }
}
