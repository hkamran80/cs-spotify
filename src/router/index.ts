import { createWebHistory, createRouter } from "vue-router";
import store from "../store";

import Home from "../views/Home.vue";
import Authorization from "../views/Authorization.vue";
import Controls from "../views/Controls.vue";
import Playlists from "../views/Playlists.vue";
import Editor from "../views/Editor.vue";

const routes = [
    { path: "/", name: "Home", component: Home },
    {
        path: "/authorize",
        name: "Authorization",
        component: Authorization,
    },
    {
        path: "/controls",
        name: "Controls",
        component: Controls,
        meta: { requiresAuth: true },
    },
    {
        path: "/playlists",
        name: "Playlists",
        component: Playlists,
        meta: { requiresAuth: true },
    },
    {
        path: "/playlists/:id",
        name: "Editor",
        component: Editor,
        meta: { requiresAuth: true },
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, _, next) => {
    if (to.meta && to.meta.requiresAuth && store.state.accessToken === null) {
        return next({ name: "Authorization" });
    } else if (
        to.name === "Authorization" &&
        store.state.accessToken !== null
    ) {
        return next({ name: "Controls" });
    } else {
        return next();
    }
});

export default router;
