"use client"

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { authedFetch, authedPost } from '@/lib/dashboard-fetch';
import HeroSectionEditor from './HeroSectionEditor';
import OurProductsSectionEditor from './OurProductsSectionEditor';
import TrendingSectionEditor from './TrendingSectionEditor';
import BestSellersSectionEditor from './BestSellersSectionEditor';
import CollectionBannerSectionEditor from './CollectionBannerSectionEditor';
import CravingsSectionEditor from './CravingsSectionEditor';
import PrivacyPolicySectionEditor from './PrivacyPolicySectionEditor';
import TermsAndConditionsSectionEditor from './TermsAndConditionsSectionEditor';
import ReturnAndRefundSectionEditor from './ReturnAndRefundSectionEditor';
import ShippingInfoSectionEditor from './ShippingInfoSectionEditor';
import AboutHeroEditor from './AboutHeroEditor';
import AboutJourneyEditor from './AboutJourneyEditor';
import AboutMissionEditor from './AboutMissionEditor';
import AboutStatsEditor from './AboutStatsEditor';
import AboutTeamEditor from './AboutTeamEditor';
import AboutSubscriptionEditor from './AboutSubscriptionEditor';
import ContactUsSectionEditor from './ContactUsSectionEditor';
import FaqSectionEditor from './FaqSectionEditor';
import PromoSectionEditor from './PromoSectionEditor';
import HeaderSectionEditor from './HeaderSectionEditor';
import FooterSectionEditor from './FooterSectionEditor';

type CmsSection = {
  sectionType: string;
  position: number;
  contentJson: any;
};

type CmsPage = {
  slug: string;
  title: string;
  status: 'draft' | 'published';
  sections: CmsSection[];
  metaTitle?: string;
  metaDescription?: string;
};

export default function CmsDashboard() {
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'home' | 'about' | 'privacy' | 'terms' | 'returns' | 'shipping' | 'contact' | 'faq' | 'promos' | 'header' | 'footer'>('home');
  const [seo, setSeo] = useState({ metaTitle: '', metaDescription: '' });

  // Section types for Home
  const homeSections = [
    { type: 'hero', component: HeroSectionEditor, position: 0 },
    { type: 'our-products', component: OurProductsSectionEditor, position: 1 },
    { type: 'trending', component: TrendingSectionEditor, position: 2 },
    { type: 'best-sellers', component: BestSellersSectionEditor, position: 3 },
    { type: 'collection-banner', component: CollectionBannerSectionEditor, position: 4 },
    { type: 'cravings', component: CravingsSectionEditor, position: 5 },
  ];

  const aboutSections = [
    { type: 'about-hero', component: AboutHeroEditor, position: 0 },
    { type: 'about-journey', component: AboutJourneyEditor, position: 1 },
    { type: 'about-mission', component: AboutMissionEditor, position: 2 },
    { type: 'about-stats', component: AboutStatsEditor, position: 3 },
    { type: 'about-team', component: AboutTeamEditor, position: 4 },
    { type: 'about-subscription', component: AboutSubscriptionEditor, position: 5 },
  ];

  const privacySections = [
    { type: 'privacy-content', component: PrivacyPolicySectionEditor, position: 0 },
  ];

  const termsSections = [
    { type: 'terms-content', component: TermsAndConditionsSectionEditor, position: 0 },
  ];

  const returnSections = [
    { type: 'return-content', component: ReturnAndRefundSectionEditor, position: 0 },
  ];

  const shippingSections = [
    { type: 'shipping-content', component: ShippingInfoSectionEditor, position: 0 },
  ];

  const contactSections = [
    { type: 'contact-details', component: ContactUsSectionEditor, position: 0 },
  ];

  const faqSections = [
    { type: 'faq', component: FaqSectionEditor, position: 0 },
  ];

  const promoSections = [
    { type: 'promos', component: PromoSectionEditor, position: 0 },
  ];

  const headerSections = [
    { type: 'header', component: HeaderSectionEditor, position: 0 },
  ];

  const footerSections = [
    { type: 'footer', component: FooterSectionEditor, position: 0 },
  ];

  const loadPage = useCallback(async (slug: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/cms/pages?slug=${encodeURIComponent(slug)}`);
      const json = await res.json() as { data?: CmsPage };
      if (json.data) {
        setPage(json.data);
        setSeo({ metaTitle: json.data.metaTitle || '', metaDescription: json.data.metaDescription || '' });
      } else {
        // Create stub
        const stub: CmsPage = {
          slug,
          title: slug === 'home' ? 'Home Page' : slug === 'about' ? 'About Page' : slug === 'privacy' ? 'Privacy Policy' : slug === 'terms' ? 'Terms & Conditions' : slug === 'returns' ? 'Return & Refund' : slug === 'shipping' ? 'Shipping Info' : slug === 'contact' ? 'Contact Us' : slug === 'promos' ? 'Promos' : slug === 'header' ? 'Header Settings' : slug === 'footer' ? 'Footer Settings' : 'FAQ',
          status: 'draft' as const,
          sections: [],
        };
        setPage(stub);
      }
    } catch (err) {
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  }, []);

  const savePage = async () => {
    if (!page) return;
    setSaving(true);
    setError('');
    try {
      const sections = page.sections.map(s => ({
        sectionType: s.sectionType,
        position: s.position,
        contentJson: s.contentJson,
      }));
      await authedPost('/api/v1/cms/pages', {
        slug: page.slug,
        title: page.title,
        status: page.status,
        sections,
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
      });
      setError('');
    } catch (err) {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadPage(tab);
  }, [tab, loadPage]);

  const updateSection = (type: string, content: any) => {
    if (!page) return;
    const existingIdx = page.sections.findIndex(s => s.sectionType === type);
    const newSections = [...page.sections];
    const allSections = tab === 'home' ? homeSections : tab === 'about' ? aboutSections : tab === 'privacy' ? privacySections : tab === 'terms' ? termsSections : tab === 'returns' ? returnSections : tab === 'shipping' ? shippingSections : tab === 'contact' ? contactSections : tab === 'faq' ? faqSections : tab === 'promos' ? promoSections : tab === 'header' ? headerSections : tab === 'footer' ? footerSections : [];
    const position = allSections.find(s => s.type === type)?.position ?? newSections.length;
    
    if (existingIdx >= 0) {
      newSections[existingIdx] = { ...newSections[existingIdx], contentJson: content };
    } else {
      newSections.push({ sectionType: type, position, contentJson: content });
      newSections.sort((a, b) => a.position - b.position);
    }
    setPage({ ...page, sections: newSections });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4A1D1F]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">CMS Dashboard</h1>
          <p className="text-sm text-[#646464]">
            Manage dynamic content for website.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={savePage} disabled={saving || !page} variant="default" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Page'}
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="flex flex-wrap justify-start w-full h-auto gap-1">
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="home">Home</TabsTrigger>
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="about">About</TabsTrigger>
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="privacy">Privacy Policy</TabsTrigger>
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="terms">Terms & Conditions</TabsTrigger>
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="returns">Return & Refund</TabsTrigger>
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="shipping">Shipping Info</TabsTrigger>
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="contact">Contact Us</TabsTrigger>
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="faq">FAQ</TabsTrigger>
          {/* <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="promos">Promos</TabsTrigger> */}
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="header">Header</TabsTrigger>
          <TabsTrigger className='cursor-pointer data-[state=active]:bg-primary data-[state=active]:text-white' value="footer">Footer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="home" className="space-y-6 mt-0">
          <div className="space-y-6">
            {homeSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6 mt-0">
          <div className="space-y-6">
            {contactSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="about" className="space-y-6 mt-0">
          <div className="space-y-6">
            {aboutSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content: any) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6 mt-0">
          <div className="space-y-6">
            {faqSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || []}
                  onChange={(content: any) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6 mt-0">
          <div className="space-y-6">
            {privacySections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="terms" className="space-y-6 mt-0">
          <div className="space-y-6">
            {termsSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="returns" className="space-y-6 mt-0">
          <div className="space-y-6">
            {returnSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6 mt-0">
          <div className="space-y-6">
            {shippingSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* <TabsContent value="promos" className="space-y-6 mt-0">
          <div className="space-y-6">
            {promoSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || []}
                  onChange={(content: any) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent> */}

        <TabsContent value="header" className="space-y-6 mt-0">
          <div className="space-y-6">
            {headerSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content: any) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6 mt-0">
          <div className="space-y-6">
            {footerSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content: any) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* <Card className="border-[#E8DCC8]">
        <CardContent className="p-6">
          <h3 className="font-semibold text-[#4A1D1F] mb-4">SEO Settings</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-[#646464]">Meta Title</Label>
              <Input
                value={seo.metaTitle}
                onChange={(e) => setSeo({...seo, metaTitle: e.target.value})}
                className="mt-1 h-9"
                placeholder="Page SEO title (60 chars)"
              />
            </div>
            <div>
              <Label className="text-sm text-[#646464]">Meta Description</Label>
              <Input
                value={seo.metaDescription}
                onChange={(e) => setSeo({...seo, metaDescription: e.target.value})}
                className="mt-1 h-9"
                placeholder="Page SEO description (160 chars)"
              />
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* <div className="text-xs text-[#646464] text-center pt-8 border-t">
        Status: {page?.status?.toUpperCase() || 'DRAFT'} | Ready to save changes
      </div> */}

    </div>
  );
}
