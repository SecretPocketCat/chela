use crate::image::PreviewMap;
use axum::{
    routing::{get, IntoMakeService},
    Router, Server,
};
use hyper::server::conn::AddrIncoming;
use std::net::SocketAddr;

mod error;
mod health;
mod preview;
mod state;

pub(crate) fn get_preview_api_server(
    previews: PreviewMap,
) -> Server<AddrIncoming, IntoMakeService<Router>> {
    let app = Router::new()
        .route("/", get(health::health))
        .route("/preview", get(preview::preview))
        // todo: the actual preview endpoint
        .with_state(state::PreviewApiState::new(previews));

    let addr = SocketAddr::from(([127, 0, 0, 1], 0));
    Server::bind(&addr).serve(app.into_make_service())
}
