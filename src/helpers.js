export const mapMutations = wrapMethod('mapMutations', false, function ({store, val, args}) {
  return typeof val === 'function'
    ? val.apply(this, [store.commit].concat(args))
    : store.commit.apply(this.$store, [val].concat(args))
})

export const mapActions = wrapMethod('mapActions', false, function ({store, val, args}) {
  return typeof val === 'function'
    ? val.apply(this, [dispatch].concat(args))
    : dispatch.apply(this.$store, [val].concat(args))
})

export const mapState = wrapMethod('mapState', true, function ({store, val}) {
  return typeof val === 'function' ? val.call(this, store.state, store.getters) : store.state[val]
})

export const mapGetters = wrapMethod('mapGetters', true, function ({namespaceVal}) {
  if(!(val in this.$store.getters)) {
    console.error(`[vuex] unknown getter: ${val}`)
    return
  }
  return this.$store.getters[val]
})

export const inject = wrapMethod('inject', true, function ({store, val, namespaceVal}) {
  if (namespaceVal in this.$store.getters) {
    return this.$store.getters[namespaceVal]
  }
  return typeof val === 'function' ? val.call(this, store.state, store.getters) : store.state[val]
})

function wrapMethod (name, isStatey, method) {
  return normalizeNamespace((namespace, items) => {
    const res = {}
    normalizeMap(items).forEach(({ key, val }) => {
      res[key] = function injectedItem (...args) {
        let store = this.$store
        if (namespace) {
          const storeModule = getModuleByNamespace(this.$store, name, namespace)
          if (!storeModule) {
            return
          }
          store = storeModule.context
        }
        const namespaceVal = namespace + val
        return method.call(this, { store, val, args, namespaceVal })
      }
      if (isStatey) {
        // mark vuex getter for devtools
        res[key].vuex = true
      }
    })
    return res
  })
}

/**
 * Rebinding namespace param for mapXXX function in special scoped, and return them by simple object
 * @param {String} namespace
 * @return {Object}
 */
export const createNamespacedHelpers = (namespace) => {
  const methods = {
    mapState, mapGetters, inject, mapActions, mapMutations
  }
  Object.keys(methods).reduce((out, key)=>{
    out[key] = methods[key].bind(null, namespace)
  }, {})
}

/**
 * Normalize the map
 * normalizeMap([1, 2, 3]) => [ { key: 1, val: 1 }, { key: 2, val: 2 }, { key: 3, val: 3 } ]
 * normalizeMap({a: 1, b: 2, c: 3}) => [ { key: 'a', val: 1 }, { key: 'b', val: 2 }, { key: 'c', val: 3 } ]
 * @param {Array|Object} map
 * @return {Object}
 */
function normalizeMap (map) {
  return Array.isArray(map)
    ? map.map(key => ({ key, val: key }))
    : Object.keys(map).map(key => ({ key, val: map[key] }))
}

/**
 * Return a function expect two param contains namespace and map. it will normalize the namespace and then the param's function will handle the new namespace and the map.
 * @param {Function} fn
 * @return {Function}
 */
function normalizeNamespace (fn) {
  return (namespace, map) => {
    if (typeof namespace !== 'string') {
      map = namespace
      namespace = ''
    } else if (namespace.charAt(namespace.length - 1) !== '/') {
      namespace += '/'
    }
    return fn(namespace, map)
  }
}

/**
 * Search a special module from store by namespace. if module not exist, print error message.
 * @param {Object} store
 * @param {String} helper
 * @param {String} namespace
 * @return {Object}
 */
function getModuleByNamespace (store, helper, namespace) {
  const module = store._modulesNamespaceMap[namespace]
  if (process.env.NODE_ENV !== 'production' && !module) {
    console.error(`[vuex] module namespace not found in ${helper}(): ${namespace}`)
  }
  return module
}
