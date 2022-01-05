import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/about',
        name: 'About',
        // 路由层面的代码分割
        // 这会为这个路由生成一个分离的块(about.[has].js)
        // 当这个路由被访问时会懒加载
        component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
    }
]

const router = new VueRouter({
    <%_ if (historyMode) { _%>
    mode: 'history',
    <%_ } _%>
    routes
})

export default router