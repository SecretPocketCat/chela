use crate::image::PreviewMap;
use axum::{
    routing::{get, IntoMakeService},
    serve::Serve,
    Router,
};
use std::net::SocketAddr;

mod health;
mod preview;
mod state;

pub(crate) async fn get_preview_api_server(
    previews: PreviewMap,
) -> (SocketAddr, Serve<IntoMakeService<Router>, Router>) {
    let app = Router::new()
        .route("/", get(health::health))
        .route("/preview", get(preview::preview))
        .with_state(state::PreviewApiState::new(previews));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();

    (
        listener.local_addr().unwrap(),
        axum::serve(listener, app.into_make_service()),
    )
}
