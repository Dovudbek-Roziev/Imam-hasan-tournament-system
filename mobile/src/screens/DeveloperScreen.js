import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, CodeXml, Send, Layers, Smartphone, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useLanguage } from '../i18n';
import LanguageToggle from '../components/LanguageToggle';

const INSTAGRAM_URL = 'https://www.instagram.com/dovudbek.roz1ev/';

// RU: Показать отдельную страницу портфолио и услуг разработчика.
// EN: Show the developer's dedicated portfolio and services page.
export default function DeveloperScreen() {
    const { language } = useLanguage();
    const insets = useSafeAreaInsets();
    const ky = language === 'ky';
    const copy = ky ? {
        eyebrow: 'ТАЖРЫЙБА · ДОЛБООРЛОР · КЫЗМАТТАР',
        title: 'Довудбек\nРозиев',
        role: 'Full-Stack жана мобилдик тиркемелерди иштеп чыгуучу',
        intro: 'Идеяны ишенимдүү жана колдонууга ыңгайлуу санариптик продуктка айландырам.',
        servicesTitle: 'Кандай жардам берем',
        webTitle: 'Веб-сайттар жана админ-панелдер',
        webText: 'React менен ыңгайлуу интерфейстер жана башкаруу панелдери.',
        mobileTitle: 'Мобилдик тиркемелер',
        mobileText: 'Android жана iOS үчүн React Native тиркемелери.',
        backendTitle: 'Backend жана API',
        backendText: 'Node.js, Express жана MongoDB менен сервердик бөлүк.',
        stackTitle: 'Технологиялар',
        projectsTitle: 'Долбоорлор',
        cottonTitle: '«ХЛОПОК» соода тиркемеси',
        cottonText: 'Android жана iOS үчүн e-commerce тиркемеси.',
        systemsTitle: 'Веб-системалар',
        systemsText: 'Деплой кылынган админ-панель жана онлайн окутуу платформасы.',
        contactTitle: 'Долбооруңуз барбы?',
        contactText: 'Идеяңызды сүйлөшүп, сизге ылайыктуу чечимди чогуу аныктайлы.',
        contactButton: 'Instagram аркылуу жазуу',
        handle: '@dovudbek.roz1ev',
        openInstagram: 'Instagram баракчасын ачуу',
    } : {
        eyebrow: 'ОПЫТ · ПРОЕКТЫ · УСЛУГИ',
        title: 'Довудбек\nРозиев',
        role: 'Full-Stack и мобильный разработчик',
        intro: 'Превращаю идеи в надёжные и удобные цифровые продукты.',
        servicesTitle: 'Чем могу помочь',
        webTitle: 'Сайты и админ-панели',
        webText: 'Удобные интерфейсы и панели управления на React.',
        mobileTitle: 'Мобильные приложения',
        mobileText: 'Приложения для Android и iOS на React Native.',
        backendTitle: 'Backend и API',
        backendText: 'Серверная часть на Node.js, Express и MongoDB.',
        stackTitle: 'Технологии',
        projectsTitle: 'Проекты',
        cottonTitle: 'Приложение «ХЛОПОК»',
        cottonText: 'E-commerce приложение для Android и iOS.',
        systemsTitle: 'Веб-системы',
        systemsText: 'Развёрнутые админ-панель и платформа онлайн-обучения.',
        contactTitle: 'Есть идея проекта?',
        contactText: 'Обсудим задачу и подберём подходящее решение.',
        contactButton: 'Написать в Instagram',
        handle: '@dovudbek.roz1ev',
        openInstagram: 'Открыть страницу Instagram',
    };

    const services = [
        { icon: Layers, title: copy.webTitle, text: copy.webText },
        { icon: Smartphone, title: copy.mobileTitle, text: copy.mobileText },
        { icon: CodeXml, title: copy.backendTitle, text: copy.backendText },
    ];

    return <ScrollView style={styles.root} contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.topBar}><Text style={styles.brand}>DR <Text style={styles.brandDot}>/</Text> PORTFOLIO</Text><LanguageToggle /></View>

        <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroIcon}><CodeXml size={22} color={COLORS.background} /></View>
            <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
            <Text style={styles.name}>{copy.title}</Text>
            <Text style={styles.role}>{copy.role}</Text>
            <Text style={styles.intro}>{copy.intro}</Text>
            <View style={styles.heroMark}><Sparkles size={16} color={COLORS.accent} /><Text style={styles.heroMarkText}>MERN · React Native</Text></View>
        </View>

        <Text style={styles.sectionTitle}>{copy.servicesTitle}</Text>
        <View style={styles.serviceList}>{services.map(({ icon: Icon, title, text }) => <View key={title} style={styles.serviceCard}>
            <View style={styles.serviceIcon}><Icon size={19} color={COLORS.primary} /></View>
            <View style={styles.serviceCopy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{text}</Text></View>
        </View>)}</View>

        <View style={styles.stackCard}><Text style={styles.sectionTitleSmall}>{copy.stackTitle}</Text><View style={styles.chips}>{['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'React Native'].map((item) => <Text key={item} style={styles.chip}>{item}</Text>)}</View></View>

        <Text style={[styles.sectionTitle, styles.projectsHeading]}>{copy.projectsTitle}</Text>
        <View style={styles.projectCard}><View style={styles.projectIcon}><Smartphone size={18} color={COLORS.accent} /></View><View style={styles.projectCopy}><Text style={styles.cardTitle}>{copy.cottonTitle}</Text><Text style={styles.cardText}>{copy.cottonText}</Text></View></View>
        <View style={styles.projectCard}><View style={styles.projectIcon}><Layers size={18} color={COLORS.accent} /></View><View style={styles.projectCopy}><Text style={styles.cardTitle}>{copy.systemsTitle}</Text><Text style={styles.cardText}>{copy.systemsText}</Text></View></View>

        <View style={styles.contactCard}>
            <View style={styles.contactIcon}><Send size={20} color={COLORS.background} /></View>
            <Text style={styles.contactTitle}>{copy.contactTitle}</Text>
            <Text style={styles.contactText}>{copy.contactText}</Text>
            <Pressable accessibilityRole="link" accessibilityLabel={copy.openInstagram} style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]} onPress={() => Linking.openURL(INSTAGRAM_URL).catch(() => {})}>
                <View style={styles.contactButtonCopy}><Text style={styles.contactButtonTitle}>{copy.contactButton}</Text><Text style={styles.contactHandle}>{copy.handle}</Text></View>
                <ArrowUpRight size={19} color={COLORS.background} />
            </Pressable>
        </View>
        <Text style={styles.footer}>Ош · Кыргызстан</Text>
    </ScrollView>;
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.background },
    container: { paddingHorizontal: 18, paddingBottom: 30 },
    topBar: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    brand: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
    brandDot: { color: COLORS.accent },
    hero: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 22, overflow: 'hidden' },
    heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -85, top: -74, borderWidth: 1, borderColor: 'rgba(255,255,255,.12)' },
    heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 19 },
    eyebrow: { color: '#D7E8DD', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
    name: { color: COLORS.background, fontSize: 34, lineHeight: 37, fontWeight: '900', marginTop: 9 },
    role: { color: '#E6F0E9', fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 11 },
    intro: { color: '#D7E8DD', fontSize: 12, lineHeight: 19, marginTop: 8 },
    heroMark: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 17, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,.12)' },
    heroMarkText: { color: COLORS.background, fontSize: 10, fontWeight: '800' },
    sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900', marginTop: 25, marginBottom: 11 },
    serviceList: { gap: 9 },
    serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
    serviceIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#EAF4ED', alignItems: 'center', justifyContent: 'center' },
    serviceCopy: { flex: 1 },
    cardTitle: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '800' },
    cardText: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 3 },
    stackCard: { marginTop: 17, padding: 15, borderRadius: 16, backgroundColor: '#F7FAF8', borderWidth: 1, borderColor: '#DCE9E0' },
    sectionTitleSmall: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800', marginBottom: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: { overflow: 'hidden', color: COLORS.primary, backgroundColor: COLORS.background, borderWidth: 1, borderColor: '#DCE9E0', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, fontSize: 10, fontWeight: '700' },
    projectsHeading: { marginTop: 24 },
    projectCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 14, marginBottom: 9, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
    projectIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F8F3E2', alignItems: 'center', justifyContent: 'center' },
    projectCopy: { flex: 1, paddingTop: 1 },
    contactCard: { alignItems: 'center', marginTop: 16, padding: 19, borderRadius: 20, backgroundColor: '#F7FAF8', borderWidth: 1, borderColor: '#DCE9E0' },
    contactIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
    contactTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 12 },
    contactText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
    contactButton: { minHeight: 54, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 15, paddingHorizontal: 14, borderRadius: 14, backgroundColor: COLORS.primary },
    contactButtonCopy: { flex: 1 },
    contactButtonTitle: { color: COLORS.background, fontSize: 12, fontWeight: '800' },
    contactHandle: { color: '#D7E8DD', fontSize: 10, marginTop: 3 },
    pressed: { opacity: 0.82 },
    footer: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 18 },
});
