use std::{fmt::format, os::windows::process::CommandExt, process::Command, time::Instant};

pub(crate) fn load_img(path: &str) -> Result<(), String> {
    let instant = Instant::now();
    let decoded_raw_img = imagepipe::simple_decode_8bit(path, 2000, 1200)?;
    println!("raw decode: {}", instant.elapsed().as_millis());

    let instant = Instant::now();

    let encoder =
        jpeg_encoder::Encoder::new_file("C:/Projects/gallery/temp/cull_cache/test2.jpg", 70)
            .unwrap();

    encoder
        .encode(
            &decoded_raw_img.data,
            decoded_raw_img.width as u16,
            decoded_raw_img.height as u16,
            jpeg_encoder::ColorType::Rgb,
        )
        .unwrap();
    println!("jpeg2: {}", instant.elapsed().as_millis());

    // this should work for what I need
    // magick "C:/Projects/gallery/temp/cull_cache/DSC05362.ARW" -quality "75" -auto-orient -resize "2000x1200>" "C:/Projects/gallery/temp/cull_cache/test3.jpg"

    let instant = Instant::now();
    Command::new("magick")
        // Command::new("C:/Program Files/ImageMagick-7.1.1-Q16-HDRI/magick.exe")
        .raw_arg(format!("\"{path}\""))
        .arg("-quality")
        .arg(75.to_string())
        .arg("-auto-orient")
        .arg("-resize")
        .arg("2000x1200>")
        .raw_arg("\"C:/Projects/gallery/temp/cull_cache/test4.jpg\"")
        .status()
        .expect("failed to generate jpg");

    println!("magick jpeg: {}", instant.elapsed().as_millis());

    Ok(())
}
