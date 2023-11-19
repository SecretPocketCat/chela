use crate::image::PreviewMap;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Deserialize;
use std::{path::PathBuf};



#[derive(Deserialize)]
pub struct QueryParams {
    path: PathBuf,
}

pub(crate) async fn preview(
    query: Query<QueryParams>,
    previews: State<PreviewMap>,
) -> Result<Response, StatusCode> {
    match previews.read().await.get(&query.path) {
        Some(file_notif) => {
            // if the img is being processed then wait for the img generation to finish
            if let Some(notify) = file_notif.read().await.as_ref() {
                notify.notified().await;
            }

            let file = tokio::fs::File::open(&query.path)
                .await
                .map_err(|_| StatusCode::NOT_FOUND)?;

            let stream = tokio_util::io::ReaderStream::new(file);
            let body = axum::body::StreamBody::new(stream);

            let headers = [(hyper::header::CONTENT_TYPE, "image/webp")];

            Ok((headers, body).into_response())
        }
        None => Err(StatusCode::NOT_FOUND),
    }
}
