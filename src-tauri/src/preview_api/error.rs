use axum::response::{IntoResponse, Response};
use std::fmt::Display;

// todo: handle the result properly?

pub(super) type ApiResult<T> = Result<T, ApiError>;

// Make our own error that wraps `anyhow::Error`.
pub(super) struct ApiError(pub hyper::StatusCode, pub String);

// Tell axum how to convert `AppError` into a response.
impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, self.1).into_response()
    }
}

// This enables using `?` on functions that return `Result<_, anyhow::Error>` to turn them into
// `Result<_, AppError>`.
impl<E> From<E> for ApiError
where
    E: Into<anyhow::Error> + Display,
{
    fn from(err: E) -> Self {
        Self(hyper::StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
    }
}
