'use client';

import { useState } from 'react';
import { useLanguage } from '@/providers/language-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe } from 'lucide-react';
import { CategoriesManagement } from '@/app/categories/components';
import { UnitsManagement } from '@/app/units/components';

export function Settings() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{t('settings')}</h1>
        <p className="text-muted-foreground mt-2 text-base">Manage your app preferences and inventory settings</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="general" className="text-base">{t('general')}</TabsTrigger>
          <TabsTrigger value="categories" className="text-base">{t('categories')}</TabsTrigger>
          <TabsTrigger value="units" className="text-base">{t('units')}</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Language Settings */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Globe className="w-6 h-6" />
                {t('language')}
              </CardTitle>
              <CardDescription className="text-base">Choose your preferred language</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'mr')}>
                <SelectTrigger className="w-full h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en" className="text-base">{t('english')}</SelectItem>
                  <SelectItem value="mr" className="text-base">{t('marathi')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-base text-muted-foreground mt-4">
                {language === 'mr'
                  ? 'तुमच्या अनुमतीने, या अनुप्रयोगातील सर्व मराठी भाषेत दिसेल.'
                  : 'The application will be displayed in your selected language.'}
              </p>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About Dukan</CardTitle>
              <CardDescription>Shop inventory management app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Dukan is a simple and powerful inventory management system designed for small grocery shops and retail businesses.
              </p>
              <p className="text-sm text-muted-foreground">
                All your data is stored locally on your device and never sent to any server. It works perfectly offline.
              </p>
              <p className="text-sm font-medium mt-4">Version 1.0.0</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6">
          <CategoriesManagement />
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units" className="mt-6">
          <UnitsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
