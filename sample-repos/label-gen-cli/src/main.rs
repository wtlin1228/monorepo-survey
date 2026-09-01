//! acme-label-gen --order <id> --sku <ABC-123456> [--qty N]
//! Exits 2 on bad arguments, 1 on invalid label input.

use std::process::ExitCode;

fn main() -> ExitCode {
    let mut order = None;
    let mut sku = None;
    let mut qty = 1u32;

    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        let mut value = |name: &str| {
            args.next().ok_or_else(|| format!("{name} requires a value"))
        };
        let result = match arg.as_str() {
            "--order" => value("--order").map(|v| order = Some(v)),
            "--sku" => value("--sku").map(|v| sku = Some(v)),
            "--qty" => value("--qty").and_then(|v| {
                v.parse().map(|n| qty = n).map_err(|_| format!("bad --qty {v:?}"))
            }),
            other => Err(format!("unknown argument {other:?}")),
        };
        if let Err(msg) = result {
            eprintln!("error: {msg}");
            eprintln!("usage: acme-label-gen --order <id> --sku <ABC-123456> [--qty N]");
            return ExitCode::from(2);
        }
    }

    let (Some(order), Some(sku)) = (order, sku) else {
        eprintln!("usage: acme-label-gen --order <id> --sku <ABC-123456> [--qty N]");
        return ExitCode::from(2);
    };

    match label_gen::render_label(&order, &sku, qty) {
        Ok(label) => {
            println!("{label}");
            ExitCode::SUCCESS
        }
        Err(msg) => {
            eprintln!("error: {msg}");
            ExitCode::FAILURE
        }
    }
}
