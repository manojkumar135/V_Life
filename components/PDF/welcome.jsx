"use client";

import {
    Page,
    Text,
    View,
    Document,
    StyleSheet,
    Image,
    Font,
} from "@react-pdf/renderer";

/* ---------------- FONT ---------------- */
Font.register({
    family: "Roboto",
    fonts: [
        { src: "/fonts/Roboto/Roboto-Regular.ttf" },
        { src: "/fonts/Roboto/Roboto-Bold.ttf", fontWeight: "bold" },
    ],
});

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
    page: {
        fontFamily: "Roboto",
        fontSize: 10,
        paddingTop: 20,
        paddingBottom: 80, // ✅ reserve space for footer
        paddingHorizontal: 50,
        color: "#000",
        backgroundColor: "#fff",
    },

    background: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        fixed: true, 
    },

    content: {
        flexGrow: 0, 
    },

    logo: {
        width: 100,
        height: 48,
        alignSelf: "center",
        marginBottom: 12,
    },

    title: {
        textAlign: "center",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 16,
    },

    paragraph: {
        lineHeight: 1.3, // ✅ SAFE VALUE
        marginBottom: 6,
        textAlign: "left",
    },

    bold: {
        fontWeight: "bold",
    },

    sectionTitle: {
        fontWeight: "bold",
        marginTop: 10,
        marginBottom: 6,
    },

    bullet: {
        marginLeft: 12,
        marginBottom: 4,
    },

    footer: {
        position: "absolute",
        bottom: 20,
        left: 50,
        right: 50,
        fontSize: 9,
        lineHeight: 1.3,
        borderTop: "1 solid #ccc",
        paddingTop: 8,
    },
});

/* ---------------- COMPONENT ---------------- */
export default function WelcomePDF({ data }) {
    return (
        <Document>
            <Page
                size={{ width: 595.28, height: 841.89 }} // ✅ FIXED A4 (points)
                style={styles.page}
                wrap={false}
            >
                {/* Background */}
                <Image
                    src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1765538939/ChatGPT_Image_Dec_12_2025_04_58_15_PM_ezevkm.png"
                    style={styles.background}
                />

                {/* Content */}
                <View style={styles.content}>
                    <Image
                        src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1764400245/maverick-logo_sddrui.png"
                        style={styles.logo}
                    />

                    <Text style={styles.title}>WELCOME TO MAVERICK</Text>

                    <Text style={[styles.paragraph, styles.bold]}>
                        To,{"\n"}
                        MAVERICK RESOURCES PVT LTD{"\n"}
                        ANDHRA PRADESH
                    </Text>

                    <Text style={styles.paragraph}>
                        Welcome to MAVERICK family. Let's start our journey together.
                    </Text>

                    <Text style={[styles.paragraph, styles.bold, { fontSize: 13 }]}>
                        Dear Mr. / Mrs. {data?.user_name || "Member"},
                    </Text>

                    <Text style={styles.paragraph}>
                        Congratulations, we extend our warm welcome to you on behalf of
                        MAVERICK Resources Private Limited. We appreciate your discretion to
                        be with us and it is a pleasure to have you with us in transforming
                        lives of our acquaintances and grow together.
                    </Text>

                    <Text style={styles.sectionTitle}>
                        Your associate Login details are as shown below:
                    </Text>

                    <Text style={styles.paragraph}>
                        <Text style={styles.bold}>Login ID : </Text>
                        {data?.login_id || "xxxxxxxxx"}{"   "}
                        <Text style={styles.bold}>Password : </Text>
                        {data?.password || "xxxxxxxx"}
                    </Text>

                    <Text style={styles.paragraph}>
                        As has already been manifested to you the benefits and privileges of
                        being with MAVERICK, to add to that, we also render and strive to
                        create a perfect environment for achieving your set goals. We
                        understand that you have an innovative way of stroking energies for
                        the better future and enthusiastic in building the same.
                    </Text>

                    <Text style={styles.paragraph}>
                        Commitment, Involvement and Perseverance, the three pre-requisites
                        to become eligible for every success. Attaining & putting these
                        traits into practice is easy here with the support rendered by
                        MAVERICK through MAVERICK Nexus & your success is assured.
                    </Text>

                    <Text style={styles.paragraph}>WITH BEST WISHES,</Text>

                    <Text style={[styles.paragraph, styles.bold]}>
                        MAVERICK
                    </Text>

                    <Text style={styles.paragraph}>www.maverickmoney.in</Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.bold}>Maverick Private Limited</Text>
                    <Text>
                        No.3, Bellary Road, Yadavananda Building, 2nd Floor, Opp. To
                        Veterinary College,
                    </Text>
                    <Text>Bengaluru - 560024</Text>
                    <Text>
                        Email : info@maverick.com | Toll-Free No : 18002965586
                    </Text>
                </View>
            </Page>
        </Document>
    );
}