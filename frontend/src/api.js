import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getOverview = () => api.get('/overview').then(r => r.data)
export const getTopStates = (n = 10) => api.get(`/top-states?n=${n}`).then(r => r.data)
export const getTopCrops = (n = 10) => api.get(`/top-crops?n=${n}`).then(r => r.data)
export const getSeasonBreakdown = () => api.get('/season-breakdown').then(r => r.data)
export const getYearlyTrend = () => api.get('/yearly-trend').then(r => r.data)
export const getStateMap = () => api.get('/state-map').then(r => r.data)
export const getYieldBySeason = () => api.get('/yield-by-season').then(r => r.data)
export const getOptions = () => api.get('/options').then(r => r.data)
export const predict = (payload) => api.post('/predict', payload).then(r => r.data)
export const getModelInsights = () => api.get('/model-insights').then(r => r.data)
