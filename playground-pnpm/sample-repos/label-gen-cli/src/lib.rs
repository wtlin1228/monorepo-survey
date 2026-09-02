//! Pallet label rendering. SKU format matches the rest of the sandbox:
//! 3 uppercase letters, a dash, 6 digits (ABC-123456).

pub fn valid_sku(sku: &str) -> bool {
    let bytes = sku.as_bytes();
    bytes.len() == 10
        && bytes[..3].iter().all(u8::is_ascii_uppercase)
        && bytes[3] == b'-'
        && bytes[4..].iter().all(u8::is_ascii_digit)
}

/// Mod-97 checksum over the label payload, printed on the label so a scanner
/// can reject mangled reprints.
pub fn checksum(payload: &str) -> u32 {
    payload.bytes().fold(0u32, |acc, b| (acc * 31 + u32::from(b)) % 97)
}

pub fn render_label(order: &str, sku: &str, qty: u32) -> Result<String, String> {
    if order.is_empty() {
        return Err("order id must not be empty".into());
    }
    if !valid_sku(sku) {
        return Err(format!("invalid sku {sku:?}, expected e.g. ABC-123456"));
    }
    if qty == 0 {
        return Err("qty must be at least 1".into());
    }
    let payload = format!("{order}|{sku}|{qty}");
    Ok(format!(
        "+----------------------------+\n\
         | ACME PALLET LABEL          |\n\
         | order: {order:<19} |\n\
         | sku:   {sku:<19} |\n\
         | qty:   {qty:<19} |\n\
         | chk:   {chk:<19} |\n\
         +----------------------------+",
        chk = checksum(&payload),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_well_formed_skus() {
        assert!(valid_sku("ABC-123456"));
        assert!(valid_sku("XYZ-000001"));
    }

    #[test]
    fn rejects_malformed_skus() {
        for sku in ["abc-123456", "ABC-12345", "ABC-1234567", "ABCD-12345", "ABC_123456", ""] {
            assert!(!valid_sku(sku), "{sku:?} should be invalid");
        }
    }

    #[test]
    fn checksum_is_stable_and_input_sensitive() {
        let base = checksum("order-1|ABC-123456|2");
        assert_eq!(base, checksum("order-1|ABC-123456|2"));
        assert_ne!(base, checksum("order-1|ABC-123456|3"));
    }

    #[test]
    fn render_embeds_fields_and_checksum() {
        let label = render_label("order-1", "ABC-123456", 2).unwrap();
        assert!(label.contains("order: order-1"));
        assert!(label.contains("sku:   ABC-123456"));
        let chk = checksum("order-1|ABC-123456|2");
        assert!(label.contains(&format!("chk:   {chk}")));
    }

    #[test]
    fn render_rejects_bad_input() {
        assert!(render_label("", "ABC-123456", 1).is_err());
        assert!(render_label("order-1", "nope", 1).is_err());
        assert!(render_label("order-1", "ABC-123456", 0).is_err());
    }
}
