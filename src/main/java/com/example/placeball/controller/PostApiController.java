package com.example.placeball.controller;

import com.example.placeball.domain.*;
import com.example.placeball.repository.*;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostApiController {

    private final CommunityPostRepository postRepository;
    private final PostImageRepository     imageRepository;
    private final MemberRepository        memberRepository;
    private final CheerPointRepository    cheerPointRepository;

    private static final Map<String, Integer> TAB_POINTS = Map.of(
            "chat",     3,
            "photo",    10,
            "cheer",    3,
            "analysis", 5,
            "info",     3
    );

    // ── 1. 글 작성 ──
    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> createPost(@RequestBody PostWriteRequest req) {
        Member member = findMember(req.getAuthor());
        if (member == null)                                           return badReq("로그인이 필요합니다.");
        if (blank(req.getTab()))                                      return badReq("카테고리를 선택해주세요.");
        if (blank(req.getTitle()))                                    return badReq("제목을 입력해주세요.");
        if (blank(req.getContent()))                                  return badReq("내용을 입력해주세요.");

        CommunityPost post = new CommunityPost();
        post.setMember(member);
        post.setTab(req.getTab());
        post.setTitle(trunc(req.getTitle(), 100));
        post.setContent(req.getContent());
        post.setPersona(req.getPersona());
        postRepository.save(post);
        saveImages(post, req.getImages());
        awardPoints(member, "POST_WRITE",
                TAB_POINTS.getOrDefault(req.getTab(), 3),
                tabLabel(req.getTab()) + " 작성: " + trunc(req.getTitle(), 30));

        return ok(Map.of("success", true, "id", post.getId(),
                "points", TAB_POINTS.getOrDefault(req.getTab(), 3)));
    }

    // ── 2. 목록 조회 ──
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getPosts(
            @RequestParam(defaultValue = "all")   String tab,
            @RequestParam(defaultValue = "likes") String sort,
            @RequestParam(defaultValue = "")      String q,
            @RequestParam(defaultValue = "0")     int    page,
            @RequestParam(defaultValue = "10")    int    size,
            @RequestParam(required = false)       String viewer) {

        Pageable pg  = PageRequest.of(page, size);
        boolean isAll = blank(tab) || "all".equals(tab);
        Page<CommunityPost> result;

        if (!q.isBlank()) {
            result = postRepository.search(isAll ? null : tab, q, pg);
        } else if ("date".equals(sort)) {
            result = isAll ? postRepository.findAllByOrderByCreatedAtDesc(pg)
                    : postRepository.findByTabOrderByCreatedAtDesc(tab, pg);
        } else if ("views".equals(sort)) {
            result = isAll ? postRepository.findAllByOrderByViewsDescCreatedAtDesc(pg)
                    : postRepository.findByTabOrderByViewsDescCreatedAtDesc(tab, pg);
        } else {
            result = isAll ? postRepository.findAllByOrderByLikesDescCreatedAtDesc(pg)
                    : postRepository.findByTabOrderByLikesDescCreatedAtDesc(tab, pg);
        }

        List<Map<String, Object>> posts = result.getContent().stream()
                .map(p -> toListItem(p, viewer)).collect(Collectors.toList());

        return ok(Map.of(
                "posts",      posts,
                "totalPages", result.getTotalPages(),
                "totalCount", result.getTotalElements(),
                "page",       page
        ));
    }

    // ── 3. 상세 조회 ──
    @GetMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> getPost(
            @PathVariable Long id,
            @RequestParam(required = false) String viewer) {

        CommunityPost post = postRepository.findById(id).orElse(null);
        if (post == null) return notFound();
        post.setViews((post.getViews() == null ? 0 : post.getViews()) + 1);
        postRepository.save(post);
        return ok(toDetail(post, viewer));
    }

    // ── 4. 글 수정 ──
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> updatePost(
            @PathVariable Long id, @RequestBody PostWriteRequest req) {

        CommunityPost post = postRepository.findById(id).orElse(null);
        if (post == null) return notFound();
        if (!post.getMember().getNickname().equals(req.getAuthor()))
            return forbidden("본인이 작성한 글만 수정할 수 있습니다.");
        if (blank(req.getTab()))     return badReq("카테고리를 선택해주세요.");
        if (blank(req.getTitle()))   return badReq("제목을 입력해주세요.");
        if (blank(req.getContent())) return badReq("내용을 입력해주세요.");

        post.setTab(req.getTab());
        post.setTitle(trunc(req.getTitle(), 100));
        post.setContent(req.getContent());
        post.setPersona(req.getPersona());
        post.setEdited(true);
        imageRepository.deleteAllByPost(post);
        post.getImages().clear();
        postRepository.save(post);
        saveImages(post, req.getImages());
        return ok(Map.of("success", true));
    }

    // ── 5. 글 삭제 ──
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deletePost(
            @PathVariable Long id,
            @RequestParam String author) {

        CommunityPost post = postRepository.findById(id).orElse(null);
        if (post == null) return notFound();
        if (!post.getMember().getNickname().equals(author))
            return forbidden("본인이 작성한 글만 삭제할 수 있습니다.");
        postRepository.delete(post);
        memberRepository.findByNickname(author).ifPresent(m ->
                awardPoints(m, "POST_DELETE", -3, "게시글 삭제 (ID: " + id + ")"));
        return ok(Map.of("success", true));
    }

    // ── 6. 좋아요 토글 ──
    @PostMapping("/{id}/like")
    @Transactional
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String viewer = body.get("viewer");
        if (blank(viewer)) return badReq("로그인이 필요합니다.");
        CommunityPost post = postRepository.findById(id).orElse(null);
        if (post == null) return notFound();
        boolean was = post.isLikedBy(viewer);
        if (was) post.removeLike(viewer);
        else     post.addLike(viewer);
        postRepository.save(post);
        return ok(Map.of("liked", !was, "likes", post.getLikes()));
    }

    // ── 7. 인증샷 목록 (index.html 카드용) ──
    @GetMapping("/photos")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getPhotos(
            @RequestParam(defaultValue = "12") int limit) {

        List<Map<String, Object>> result = new ArrayList<>();
        List<CommunityPost> photoPosts =
                postRepository.findTop12ByTabOrderByCreatedAtDesc("photo");

        for (CommunityPost p : photoPosts) {
            for (PostImage img : imageRepository.findByPostOrderBySortOrderAsc(p)) {
                if (result.size() >= limit) break;
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("postId",    p.getId());
                item.put("imageData", img.getImageData());
                item.put("author",    p.getMember().getNickname());
                item.put("title",     p.getTitle());
                item.put("createdAt", p.getCreatedAt().toString());
                result.add(item);
            }
            if (result.size() >= limit) break;
        }
        return ResponseEntity.ok(result);
    }

    // ── 8. 탭별 카운트 ──
    @GetMapping("/counts")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getCounts() {
        return ResponseEntity.ok(new LinkedHashMap<>(Map.of(
                "all",      postRepository.count(),
                "chat",     postRepository.countByTab("chat"),
                "photo",    postRepository.countByTab("photo"),
                "analysis", postRepository.countByTab("analysis"),
                "cheer",    postRepository.countByTab("cheer"),
                "info",     postRepository.countByTab("info")
        )));
    }

    // ── 9. 응원 지수 ──
    @GetMapping("/cheer-ratio")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getCheerRatio() {
        List<Object[]> ranking = cheerPointRepository.findRanking();
        int homeTotal = 0, awayTotal = 0;
        for (Object[] row : ranking) {
            int pts = ((Number) row[1]).intValue();
            if (isHomeFan(((Member) row[0]).getFavoriteTeam())) homeTotal += pts;
            else                                                  awayTotal += pts;
        }
        if (homeTotal == 0 && awayTotal == 0) { homeTotal = 50; awayTotal = 50; }
        int total   = homeTotal + awayTotal;
        int homePct = Math.round((float) homeTotal / total * 100);
        return ResponseEntity.ok(Map.of(
                "homeScore", homeTotal,
                "awayScore", awayTotal,
                "homePct",   homePct,
                "awayPct",   100 - homePct
        ));
    }

    // ═══════════════════════ helpers ═══════════════════════
    private void saveImages(CommunityPost post, List<String> images) {
        if (images == null) return;
        for (int i = 0; i < Math.min(images.size(), 3); i++) {
            PostImage img = new PostImage();
            img.setPost(post); img.setImageData(images.get(i)); img.setSortOrder(i);
            imageRepository.save(img);
        }
    }

    private void awardPoints(Member m, String type, int amount, String desc) {
        CheerPoint cp = new CheerPoint();
        cp.setMember(m); cp.setPointType(type); cp.setAmount(amount); cp.setDescription(desc);
        cheerPointRepository.save(cp);
    }

    private Map<String, Object> toListItem(CommunityPost p, String viewer) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",         p.getId());
        m.put("tab",        p.getTab());
        m.put("title",      p.getTitle());
        m.put("author",     p.getMember().getNickname());
        m.put("persona",    p.getPersona() != null ? p.getPersona() : "⚾");
        m.put("likes",      p.getLikes()   != null ? p.getLikes()   : 0);
        m.put("views",      p.getViews()   != null ? p.getViews()   : 0);
        m.put("date",       p.getCreatedAt().toString());
        m.put("edited",     Boolean.TRUE.equals(p.getEdited()));
        m.put("liked",      viewer != null && p.isLikedBy(viewer));
        m.put("isOwner",    viewer != null && viewer.equals(p.getMember().getNickname()));
        m.put("hasImages",  !p.getImages().isEmpty());
        m.put("imageCount", p.getImages().size());
        return m;
    }

    private Map<String, Object> toDetail(CommunityPost p, String viewer) {
        Map<String, Object> m = new LinkedHashMap<>(toListItem(p, viewer));
        m.put("content", p.getContent());
        m.put("images",  imageRepository.findByPostOrderBySortOrderAsc(p)
                .stream().map(PostImage::getImageData).collect(Collectors.toList()));
        return m;
    }

    private Member findMember(String nick) {
        if (blank(nick)) return null;
        return memberRepository.findByNickname(nick).orElse(null);
    }
    private boolean blank(String s)         { return s == null || s.isBlank(); }
    private String  trunc(String s, int n)  { return s.length() <= n ? s : s.substring(0, n); }
    private boolean isHomeFan(String team)  { return team == null || (!team.equals("LG") && !team.equals("두산")); }
    private String tabLabel(String tab) {
        return switch (tab != null ? tab : "") {
            case "chat" -> "잡담"; case "photo" -> "인증샷"; case "cheer" -> "응원/선수";
            case "analysis" -> "경기 분석"; case "info" -> "정보/팁"; default -> "커뮤니티";
        };
    }

    private ResponseEntity<Map<String, Object>> ok(Map<String, Object> b)       { return ResponseEntity.ok(b); }
    private ResponseEntity<Map<String, Object>> badReq(String msg)               { return ResponseEntity.badRequest().body(Map.of("success", false, "message", msg)); }
    private ResponseEntity<Map<String, Object>> notFound()                       { return ResponseEntity.status(404).body(Map.of("success", false, "message", "게시글을 찾을 수 없습니다.")); }
    private ResponseEntity<Map<String, Object>> forbidden(String msg)            { return ResponseEntity.status(403).body(Map.of("success", false, "message", msg)); }
}

@Data
class PostWriteRequest {
    private String       tab;
    private String       title;
    private String       content;
    private String       author;
    private String       persona;
    private List<String> images;
}