use super::state::HealthState;
use axum::{extract::State, response::IntoResponse, Json};
use serde::Serialize;

#[derive(Serialize)]
pub(crate) struct ApiStateResponse {
    uptime: String,
    status: ApiStatus,
}

#[derive(Serialize)]
pub(crate) enum ApiStatus {
    #[serde(rename(serialize = "OK"))]
    Ok,
}

pub(crate) async fn health(api_state: State<HealthState>) -> impl IntoResponse {
    let elapsed = api_state.start_time.elapsed();
    let secs = elapsed.as_secs();

    let (value, unit) = match secs {
        ..=60 => (elapsed.as_secs_f64(), "second"),
        61..=3600 => (secs as f64 / 60., "minute"),
        _ => (secs as f64 / 60. / 60., "hour"),
    };

    Json(ApiStateResponse {
        uptime: format!("{:.2} {}(s)", value, unit),
        status: ApiStatus::Ok,
    })
}
