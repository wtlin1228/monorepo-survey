//! End-to-end tests: cargo builds the real binary for integration tests and
//! exposes its path as CARGO_BIN_EXE_<name>; drive it like a user would.

use std::process::Command;

fn cli() -> Command {
    Command::new(env!("CARGO_BIN_EXE_acme-label-gen"))
}

#[test]
fn prints_a_label_for_valid_input() {
    let out = cli()
        .args(["--order", "order-e2e-1", "--sku", "ABC-123456", "--qty", "2"])
        .output()
        .unwrap();
    assert!(out.status.success(), "stderr: {}", String::from_utf8_lossy(&out.stderr));
    let stdout = String::from_utf8(out.stdout).unwrap();
    assert!(stdout.contains("ACME PALLET LABEL"));
    assert!(stdout.contains("order: order-e2e-1"));
    assert!(stdout.contains("sku:   ABC-123456"));
    assert!(stdout.contains(&format!("chk:   {}", label_gen::checksum("order-e2e-1|ABC-123456|2"))));
}

#[test]
fn invalid_sku_exits_one() {
    let out = cli().args(["--order", "order-1", "--sku", "bogus"]).output().unwrap();
    assert_eq!(out.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&out.stderr).contains("invalid sku"));
}

#[test]
fn missing_arguments_exit_two_with_usage() {
    let out = cli().output().unwrap();
    assert_eq!(out.status.code(), Some(2));
    assert!(String::from_utf8_lossy(&out.stderr).contains("usage:"));
}
