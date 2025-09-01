import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown } from 'lucide-react';

const VoiceMemoHelp: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <div id="vm-root">
      <Card className="mb-6">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-lg">
                <span>How to upload from Voice Memos / Recorder</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              <Tabs defaultValue="ios" className="w-full" aria-label="Choose platform">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ios">iOS</TabsTrigger>
                  <TabsTrigger value="android">Android</TabsTrigger>
                </TabsList>

                {/* iOS Instructions */}
                <TabsContent value="ios">
                  <div className="p-4 space-y-4 text-muted-foreground">
                    <ol className="list-decimal pl-5 space-y-2 leading-relaxed">
                      <li>
                        Open the <strong>Voice Memos</strong> app.
                      </li>
                      <li>
                        Select your recording, then tap <strong>…</strong> (three dots).
                      </li>
                      <li>
                        Tap <strong>Save to Files</strong>.
                      </li>
                      <li>
                        Choose a location (e.g., <strong>On My iPhone</strong> or{' '}
                        <strong>iCloud Drive</strong>) and tap <strong>Save</strong>.
                        <br />
                        <small>(It saves as <code>.m4a</code> by default.)</small>
                      </li>
                      <li>
                        In Prospector: <strong>Upload Call for Review → Choose File</strong>.
                      </li>
                      <li>
                        Tap <strong>Browse</strong>, go to the folder you saved to, and select your{' '}
                        <code>.m4a</code> file.
                      </li>
                    </ol>

                    <div className="rounded-md border border-dashed p-3 text-sm">
                      <p className="font-semibold text-foreground">Tips (iOS)</p>
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        <li>Rename the memo in Voice Memos (tap the title) before saving.</li>
                        <li>
                          If you don’t see <em>Save to Files</em>, use <strong>Share</strong> →{' '}
                          <strong>Save to Files</strong>.
                        </li>
                        <li>
                          Common paths in Files: <em>On My iPhone</em> or <em>iCloud Drive</em> →
                          your folder.
                        </li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                {/* Android Instructions */}
                <TabsContent value="android">
                  <div className="p-4 space-y-4 text-muted-foreground">
                    <ol className="list-decimal pl-5 space-y-2 leading-relaxed">
                      <li>
                        Open your device’s <strong>Recorder / Voice Recorder</strong> app (name may
                        vary by brand).
                      </li>
                      <li>
                        Select the recording, then tap <strong>Share</strong> or{' '}
                        <strong>Save as file</strong>.
                      </li>
                      <li>
                        Choose a destination like <strong>Files</strong> → <strong>Downloads</strong>{' '}
                        (or <strong>Recordings</strong>) and save.
                        <br />
                        <small>
                          Common formats: <code>.m4a</code>, <code>.mp3</code>, <code>.wav</code>.
                        </small>
                      </li>
                      <li>
                        In Prospector: <strong>Upload Call for Review → Choose File</strong>.
                      </li>
                      <li>
                        In the picker, open the <strong>Audio</strong> tab (if available) or browse
                        to <strong>Downloads/Recordings</strong> and select your file.
                      </li>
                    </ol>

                    <div className="rounded-md border border-dashed p-3 text-sm">
                      <p className="font-semibold text-foreground">Tips (Android)</p>
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        <li>
                          Samsung: try <em>Internal storage → Music/Recordings</em> or <em>Sounds</em>.
                        </li>
                        <li>Pixel: check <em>Files → Downloads</em> or <em>Recordings</em>.</li>
                        <li>Allow file/storage permission if prompted.</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                Supported formats: <code>.m4a</code>, <code>.mp3</code>, <code>.wav</code>. If you
                can’t find the file, re-save it to <em>Downloads</em> and try again.
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default VoiceMemoHelp;
