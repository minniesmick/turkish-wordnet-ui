// Zemberek (Apache 2.0, github.com/ahmetaa/zemberek-nlp) için kalıcı çalışan köprü: server.py stdin'e komut yazar, stdout'tan tek satır JSON okur.
//   A<TAB>sözcük   -> tek sözcük çözümlemeleri
//   S<TAB>cümle    -> cümle çözümleme + morfolojik belirsizlik giderme (perceptron)
// Her yanıt "@@" önekiyle başlar; kütüphanenin yazdığı her şey stderr'e yönlendirilir.
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import zemberek.morphology.TurkishMorphology;
import zemberek.morphology.analysis.*;

public class ZemberekBridge {
    static String q(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default: if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
            }
        }
        return b.append('"').toString();
    }

    static String one(SingleAnalysis a) {
        StringBuilder m = new StringBuilder("[");
        boolean first = true;
        for (SingleAnalysis.MorphemeData d : a.getMorphemeDataList()) {
            if (!first) m.append(',');
            first = false;
            m.append("{\"id\":").append(q(d.morpheme.id)).append(",\"name\":").append(q(d.morpheme.name))
             .append(",\"surface\":").append(q(d.surface)).append(",\"deriv\":").append(d.morpheme.derivational).append('}');
        }
        m.append(']');
        return "{\"lexical\":" + q(a.formatLexical()) + ",\"long\":" + q(a.formatLong())
            + ",\"oflazer\":" + q(AnalysisFormatters.OFLAZER_STYLE.format(a))
            + ",\"stem\":" + q(a.getStem()) + ",\"ending\":" + q(a.getEnding())
            + ",\"lemma\":" + q(a.getDictionaryItem().lemma) + ",\"pos\":" + q(String.valueOf(a.getPos()))
            + ",\"unknown\":" + a.isUnknown() + ",\"morphemes\":" + m + "}";
    }

    static String word(WordAnalysis w) {
        StringBuilder b = new StringBuilder("[");
        boolean first = true;
        for (SingleAnalysis a : w) { if (!first) b.append(','); first = false; b.append(one(a)); }
        return b.append(']').toString();
    }

    public static void main(String[] args) throws Exception {
        PrintStream out = new PrintStream(new FileOutputStream(FileDescriptor.out), true, "UTF-8");
        System.setOut(System.err);
        TurkishMorphology morph = TurkishMorphology.createWithDefaults();
        out.println("@@READY");
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String line;
        while ((line = in.readLine()) != null) {
            int t = line.indexOf('\t');
            String cmd = t < 0 ? line : line.substring(0, t), arg = t < 0 ? "" : line.substring(t + 1);
            try {
                if (cmd.equals("A")) {
                    out.println("@@{\"input\":" + q(arg) + ",\"analyses\":" + word(morph.analyze(arg)) + "}");
                } else if (cmd.equals("S")) {
                    SentenceAnalysis s = morph.analyzeAndDisambiguate(arg);
                    StringBuilder b = new StringBuilder("@@{\"sentence\":" + q(arg) + ",\"words\":[");
                    boolean first = true;
                    for (SentenceWordAnalysis e : s) {
                        if (!first) b.append(',');
                        first = false;
                        b.append("{\"input\":").append(q(e.getWordAnalysis().getInput())).append(",\"best\":").append(one(e.getBestAnalysis()))
                         .append(",\"all\":").append(word(e.getWordAnalysis())).append('}');
                    }
                    out.println(b.append("]}"));
                } else if (cmd.equals("Q")) {
                    break;
                } else {
                    out.println("@@{\"error\":" + q("unknown command") + "}");
                }
            } catch (Throwable ex) {
                out.println("@@{\"error\":" + q(String.valueOf(ex)) + "}");
            }
        }
    }
}
