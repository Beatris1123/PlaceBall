package com.example.placeball.controller;

import com.example.placeball.domain.Comment;
import com.example.placeball.domain.CommunityPost;
import com.example.placeball.domain.Member;
import com.example.placeball.repository.CommentRepository;
import com.example.placeball.repository.CommunityPostRepository;
import com.example.placeball.repository.MemberRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 댓글 CRUD + 출석체크
 *
 * [댓글]
 *   GET    /api/comments?postId=1           댓글 목록
 *   POST   /api/comments                    댓글 작성
 *   PUT    /api/comments/{id}               댓글 수정 (본인만)
 *   DELETE /api/comments/{id}?author=닉네임  댓글 삭제 (본인만)
 *
 * [출석체크]
 *   POST   /api/attendance          오늘 출석 체크
 *   GET    /api/attendance?nickname=닉네임   출석 현황 조회
 */
@RestController
@RequiredArgsConstructor
public class CommentApiController {

    private final CommentRepository       commentRepository;
    private final CommunityPostRepository postRepository;
    private final MemberRepository        memberRepository;

    // ══════════════════════════════════════════════════════════
    // 댓글 목록
    // GET /api/comments?postId=1&viewer=닉네임
    // ══════════════════════════════════════════════════════════
    @GetMapping("/api/comments")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getComments(
            @RequestParam Long postId,
            @RequestParam(required = false) String viewer) {

        CommunityPost post = postRepository.findById(postId).orElse(null);
        if (post == null) return ResponseEntity.ok(List.of());

        List<Comment> comments = commentRepository.findByPostOrderByCreatedAtAsc(post);
        List<Map<String, Object>> result = comments.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",        c.getId());
            m.put("author",    c.getMember().getNickname());
            m.put("content",   c.getContent());
            m.put("date",      c.getCreatedAt().toString());
            m.put("edited",    Boolean.TRUE.equals(c.getEdited()));
            m.put("isOwner",   viewer != null && viewer.equals(c.getMember().getNickname()));
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ══════════════════════════════════════════════════════════
    // 댓글 작성
    // POST /api/comments
    // ══════════════════════════════════════════════════════════
    @PostMapping("/api/comments")
    @Transactional
    public ResponseEntity<Map<String, Object>> createComment(
            @RequestBody CommentRequest req) {

        if (blank(req.getAuthor()))  return badReq("로그인이 필요합니다.");
        if (blank(req.getContent())) return badReq("댓글 내용을 입력해주세요.");
        if (req.getPostId() == null) return badReq("게시글 정보가 없습니다.");

        Member member = memberRepository.findByNickname(req.getAuthor()).orElse(null);
        if (member == null) return badReq("회원 정보를 찾을 수 없습니다.");

        CommunityPost post = postRepository.findById(req.getPostId()).orElse(null);
        if (post == null) return badReq("게시글을 찾을 수 없습니다.");

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setMember(member);
        comment.setContent(req.getContent().substring(0, Math.min(req.getContent().length(), 500)));
        commentRepository.save(comment);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("id",      comment.getId());
        res.put("author",  member.getNickname());
        res.put("content", comment.getContent());
        res.put("date",    comment.getCreatedAt().toString());
        res.put("isOwner", true);
        return ResponseEntity.ok(res);
    }

    // ══════════════════════════════════════════════════════════
    // 댓글 수정
    // PUT /api/comments/{id}
    // ══════════════════════════════════════════════════════════
    @PutMapping("/api/comments/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateComment(
            @PathVariable Long id,
            @RequestBody CommentRequest req) {

        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) return notFound();
        if (!comment.getMember().getNickname().equals(req.getAuthor()))
            return forbidden("본인 댓글만 수정할 수 있습니다.");
        if (blank(req.getContent())) return badReq("댓글 내용을 입력해주세요.");

        comment.setContent(req.getContent().substring(0, Math.min(req.getContent().length(), 500)));
        comment.setEdited(true);
        commentRepository.save(comment);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ══════════════════════════════════════════════════════════
    // 댓글 삭제
    // DELETE /api/comments/{id}?author=닉네임
    // ══════════════════════════════════════════════════════════
    @DeleteMapping("/api/comments/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteComment(
            @PathVariable Long id,
            @RequestParam String author) {

        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) return notFound();
        if (!comment.getMember().getNickname().equals(author))
            return forbidden("본인 댓글만 삭제할 수 있습니다.");

        commentRepository.delete(comment);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ══════════════════════════════════════════════════════════
    // 출석체크
    // POST /api/attendance   body: { "nickname": "..." }
    // GET  /api/attendance?nickname=...
    // ══════════════════════════════════════════════════════════

    /** 오늘 출석체크 여부를 member의 nickname+날짜를 키로 간단 저장 (in-memory 캐시 역할) */
    private final Map<String, LocalDate> attendanceCache = new HashMap<>();

    @PostMapping("/api/attendance")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> checkAttendance(
            @RequestBody Map<String, String> body) {

        String nick = body.get("nickname");
        if (blank(nick)) return badReq("로그인이 필요합니다.");

        Member member = memberRepository.findByNickname(nick).orElse(null);
        if (member == null) return badReq("회원 정보를 찾을 수 없습니다.");

        LocalDate today = LocalDate.now();
        String cacheKey = nick + "_" + today;

        if (attendanceCache.containsKey(cacheKey)) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "오늘은 이미 출석체크를 했어요! 내일 또 만나요 ⚾",
                    "alreadyDone", true
            ));
        }

        attendanceCache.put(cacheKey, today);

        return ResponseEntity.ok(Map.of(
                "success",     true,
                "message",     "출석체크 완료! 오늘도 직관 가자! ⚾",
                "alreadyDone", false,
                "date",        today.toString(),
                "nickname",    nick
        ));
    }

    @GetMapping("/api/attendance")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getAttendance(
            @RequestParam String nickname) {

        LocalDate today = LocalDate.now();
        String cacheKey = nickname + "_" + today;
        boolean doneToday = attendanceCache.containsKey(cacheKey);

        return ResponseEntity.ok(Map.of(
                "doneToday", doneToday,
                "nickname",  nickname,
                "date",      today.toString()
        ));
    }

    // helpers
    private boolean blank(String s) { return s == null || s.isBlank(); }
    private ResponseEntity<Map<String, Object>> badReq(String msg) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "message", msg));
    }
    private ResponseEntity<Map<String, Object>> notFound() {
        return ResponseEntity.status(404).body(Map.of("success", false, "message", "댓글을 찾을 수 없습니다."));
    }
    private ResponseEntity<Map<String, Object>> forbidden(String msg) {
        return ResponseEntity.status(403).body(Map.of("success", false, "message", msg));
    }
}

// ── 댓글 요청 DTO ──
@Data
class CommentRequest {
    private Long   postId;
    private String author;
    private String content;
}