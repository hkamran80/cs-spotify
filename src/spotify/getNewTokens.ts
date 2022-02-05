import { Store } from "vuex";
import { State } from "../store";

export function checkTokenExpired(store: Store<State>): boolean {
    return (
        new Date().getTime() - (store.state.expirationStart as number) >
        ((store.state.expiresIn as number) - 100) * 1000
    );
}

export async function getNewTokens(
    store: Store<State>
): Promise<string | null | undefined> {
    if (checkTokenExpired(store)) {
        let tokenParameters = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: store.state.refreshToken as string,
        });

        const response = await fetch(`https://accounts.spotify.com/api/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${btoa(
                    (import.meta.env.VITE_APP_SPOTIFY_CLIENT_ID as string) +
                        ":" +
                        (import.meta.env
                            .VITE_APP_SPOTIFY_CLIENT_SECRET as string)
                )}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: tokenParameters,
        });

        if (response) {
            const json = await response.json();
            if (Object.keys(json).indexOf("access_token") !== -1) {
                store.dispatch("updateSpotifyTokens", {
                    accessToken: json.access_token,
                    expiresIn: json.expires_in,
                });

                return json.access_token as string;
            } else {
                console.error(json);
                return null;
            }
        }

        return null;
    }
}
