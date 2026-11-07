import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getOverview = () => api.get('/overview').then(r => r.data)
export const getTopStates = (n = 10, yearMin, yearMax) => api.get(`/top-states?n=${n}${yearMin ? `&year_min=${yearMin}&year_max=${yearMax}` : ''}`).then(r => r.data)
export const getTopCrops = (n = 10, yearMin, yearMax) => api.get(`/top-crops?n=${n}${yearMin ? `&year_min=${yearMin}&year_max=${yearMax}` : ''}`).then(r => r.data)
export const getSeasonBreakdown = (yearMin, yearMax) => api.get(`/season-breakdown${yearMin ? `?year_min=${yearMin}&year_max=${yearMax}` : ''}`).then(r => r.data)
export const getYearlyTrend = () => api.get('/yearly-trend').then(r => r.data)
export const getStateMap = () => api.get('/state-map').then(r => r.data)
export const getYieldBySeason = () => api.get('/yield-by-season').then(r => r.data)
export const getHeatmap = () => api.get('/heatmap').then(r => r.data)
export const getEfficiency = () => api.get('/efficiency').then(r => r.data)
export const getOptions = () => api.get('/options').then(r => r.data)
export const getDistrictAnalysis = (state, n = 15) => api.get(`/district-analysis?state=${encodeURIComponent(state)}&n=${n}`).then(r => r.data)
export const getCompare = (type, a, b) => api.get(`/compare?type=${type}&a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`).then(r => r.data)
export const getForecast = (crop, horizon = 5) => api.get(`/forecast?crop=${encodeURIComponent(crop)}&horizon=${horizon}`).then(r => r.data)
export const predict = (payload) => api.post('/predict', payload).then(r => r.data)
export const getModelInsights = () => api.get('/model-insights').then(r => r.data)
export const getRecommend = (state, season, area, year = 2015, topN = 5) =>
  api.get(`/recommend?state=${encodeURIComponent(state)}&season=${encodeURIComponent(season)}&area=${area}&year=${year}&top_n=${topN}`).then(r => r.data)
