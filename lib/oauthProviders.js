import prisma from "@/lib/db";

const providerFields = {
    google: { clientId: "googleClientId", clientSecret: "googleClientSecret" },
    github: { clientId: "githubClientId", clientSecret: "githubClientSecret" }
};

export async function getOAuthProviderConfig(provider) {
    const fields = providerFields[provider];
    if (!fields) return null;

    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    return {
        enabled: settings?.[`${provider}AuthEnabled`] !== false,
        clientId: settings?.[fields.clientId] || "",
        clientSecret: settings?.[fields.clientSecret] || ""
    };
}

export async function getOAuthProviderStatus() {
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    return {
        google: {
            enabled: settings?.googleAuthEnabled !== false,
            configured: Boolean(settings?.googleClientId && settings?.googleClientSecret)
        },
        github: {
            enabled: settings?.githubAuthEnabled !== false,
            configured: Boolean(settings?.githubClientId && settings?.githubClientSecret)
        }
    };
}
