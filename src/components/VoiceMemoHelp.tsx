import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown } from 'lucide-react';

const VoiceMemoHelp = () => {
  return (
    <div id="vm-root">
      <Card className="mb-6">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-lg">
                How to upload from Voice Memos / Recorder
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Tabs defaultValue="ios" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ios">iOS</TabsTrigger>
                  <TabsTrigger value="android">Android</TabsTrigger>
                </TabsList>
                <TabsContent value="ios">
                  <div className="p-4 text-muted-foreground">
                    iOS instructions placeholder
                  </div>
                </TabsContent>
                <TabsContent value="android">
                  <div className="p-4 text-muted-foreground">
                    Android instructions placeholder
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default VoiceMemoHelp;