import { Store } from "vuex";

declare module "@vue/runtime-core" {
    // declare your own store states
    interface State {
        accessToken: string | null;
        refreshToken: string | null;
        expiresIn: number | null;
        expirationStart: number | null;
    }

    // provide typings for `this.$store`
    interface ComponentCustomProperties {
        $store: Store<State>;
    }
}
