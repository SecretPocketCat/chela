use crate::image::PreviewMap;
use axum::extract::FromRef;
use std::{sync::Arc, time::Instant};

#[derive(Clone, Default)]
pub(crate) struct PreviewApiState {
    health: HealthState,
    previews: PreviewMap,
}

impl PreviewApiState {
    pub(crate) fn new(previews: PreviewMap) -> Self {
        Self {
            health: Default::default(),
            previews,
        }
    }
}

#[derive(Clone)]
pub(crate) struct HealthState {
    pub(crate) start_time: Instant,
}

impl Default for HealthState {
    fn default() -> Self {
        Self {
            start_time: Instant::now(),
        }
    }
}

impl FromRef<PreviewApiState> for HealthState {
    fn from_ref(app_state: &PreviewApiState) -> HealthState {
        app_state.health.clone()
    }
}

impl FromRef<PreviewApiState> for PreviewMap {
    fn from_ref(app_state: &PreviewApiState) -> PreviewMap {
        Arc::clone(&app_state.previews)
    }
}
