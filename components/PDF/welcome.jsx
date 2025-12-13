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
        fixed: true, // ✅ required
    },

    content: {
        flexGrow: 0, // ✅ prevent stretching
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

                    <Text style={[styles.paragraph, styles.bold, { fontSize: 13 }]}>
                        Dear {data?.user_name || "Member"},
                    </Text>

                    <Text style={styles.paragraph}>
                        As an Associate, welcome to the Maverick Family! We at Maverick
                        adhere to the timeless ideas of wellbeing and health. Our goal is to
                        make sure that everyone puts their health first and aspires to
                        achievement, progress, and prosperity. According to the Atharva
                        Veda, success is largely dependent on one’s state of health.
                    </Text>

                    <Text style={styles.paragraph}>
                        As an important part of the Maverick family, you will have the
                        chance to grow financially for the rest of your life by endorsing
                        and utilizing our premium health and wellness supplements.
                    </Text>

                    <Text style={styles.sectionTitle}>Our Commitment to Quality :</Text>

                    <Text style={styles.paragraph}>
                        Maverick is well known for manufacturing Health & Wellness Products
                        that are safe, effective, and up to international standards.
                    </Text>

                    <Text style={styles.paragraph}>
                        We are pleased to own a number of quality certificates:
                    </Text>

                    <Text style={styles.bullet}>• ISO 9001:2015/HACCP</Text>
                    <Text style={styles.bullet}>• HALAL</Text>
                    <Text style={styles.bullet}>• KOSHER</Text>
                    <Text style={styles.bullet}>• FSSAI</Text>
                    <Text style={styles.bullet}>• 100% Organic Certified Products</Text>

                    <Text style={styles.sectionTitle}>
                        Unique Business Opportunity :
                    </Text>

                    <Text style={styles.paragraph}>
                        Maverick offers a rewarding compensation plan that ensures
                        significantly higher returns for our associates.
                    </Text>

                    <Text style={styles.sectionTitle}>Support and Feedback :</Text>

                    <Text style={styles.paragraph}>
                        We assure you that you are in capable hands and encourage you to
                        reach out to Maverick leadership for support anytime.
                    </Text>

                    <Text style={styles.paragraph}>
                        For queries, call 18002965586 or email dcs@maverick.com.
                    </Text>

                    {/* <Text style={styles.paragraph}>Wish You Success!
                    </Text> */}
                    <Text style={styles.paragraph}>Warm Regards!</Text>

                    {/* <Text style={[styles.paragraph, styles.bold]}>
                        Warm Regards!
                    </Text> */}
                    <Text style={[styles.paragraph, styles.bold]}>
                        MAVERICK MANAGEMENT
                    </Text>
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
