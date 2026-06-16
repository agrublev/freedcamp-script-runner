import fsr from '../../../docs/FSR.md?raw'
import pluginQuickstart from '../../../docs/PLUGIN_QUICKSTART.md?raw'
import pluginDev from '../../../docs/PLUGIN_DEVELOPMENT.md?raw'
import pluginApi from '../../../docs/PLUGIN_API.md?raw'
import completions from '../../../docs/COMPLETIONS.md?raw'
import doctor from '../../../docs/DOCTOR.md?raw'
import doctorRef from '../../../docs/DOCTOR_QUICK_REFERENCE.md?raw'
import profiles from '../../../docs/PROFILES.md?raw'
import cache from '../../../docs/CACHE_GUIDE.md?raw'
import testing from '../../../docs/TESTING-GUIDE.md?raw'
import migration from '../../../docs/v7-migration-guide.md?raw'

export const docs = {
  overview: fsr,
  migration,
  'plugin-quickstart': pluginQuickstart,
  'plugin-dev': pluginDev,
  'plugin-api': pluginApi,
  completions,
  doctor,
  'doctor-ref': doctorRef,
  profiles,
  cache,
  testing,
}

export const nav = [
  {
    group: 'Getting Started',
    items: [
      { id: 'overview', label: 'Overview & Commands' },
      { id: 'migration', label: 'v7 Migration Guide' },
    ],
  },
  {
    group: 'Plugins',
    items: [
      { id: 'plugin-quickstart', label: 'Quick Start' },
      { id: 'plugin-dev', label: 'Development Guide' },
      { id: 'plugin-api', label: 'Plugin API' },
    ],
  },
  {
    group: 'Features',
    items: [
      { id: 'completions', label: 'Shell Completions' },
      { id: 'doctor', label: 'Doctor' },
      { id: 'doctor-ref', label: 'Doctor Quick Reference' },
      { id: 'profiles', label: 'Profiles' },
      { id: 'cache', label: 'Cache Guide' },
    ],
  },
  {
    group: 'Testing',
    items: [
      { id: 'testing', label: 'Testing Guide' },
    ],
  },
]
