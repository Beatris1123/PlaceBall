package com.example.placeball.controller;

import com.example.placeball.domain.Comment;
import com.example.placeball.domain.CommunityPost;
import com.example.placeball.domain.Member;
import com.example.placeball.repository.CheerPointRepository;
import com.example.placeball.repository.CommentRepository;
import com.example.placeball.repository.CommunityPostRepository;
import com.example.placeball.repository.MemberRepository;
import com.example.placeball.service.CheerPointService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class CommentApiController {

    private final CommentRepository       commentRepository;
    private final CommunityPostRepository postRepository;
    private final MemberRepository        memberRepository;
    private final CheerPointRepository    cheerPointRepository;
    private final CheerPointService       cheerPointService;

    // ── 댓글 목록 ──
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
            m.put("id",      c.getId());
            m.put("author",  c.getMember().getNickname());
            m.put("content", c.getContent());
            m.put("date",    c.getCreatedAt().toString());
            m.put("edited",  Boolean.TRUE.equals(c.getEdited()));
            m.put("isOwner", viewer != null && viewer.equals(c.getMember().getNickname()));
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── 댓글 작성 (+포인트 적립) ──
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

        // 오늘 1회만 적립, seatZone 자동 연결
        int earnedPoints = cheerPointService.award(
                member, "COMMENT_WRITE", 3, "댓글 작성", true);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("id",      comment.getId());
        res.put("author",  member.getNickname());
        res.put("content", comment.getContent());
        res.put("date",    comment.getCreatedAt().toString());
        res.put("isOwner", true);
        res.put("points",  earnedPoints);
        return ResponseEntity.ok(res);
    }

    // ── 댓글 수정 ──
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

    // ── 댓글 삭제 ──
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

    // ── 출석체크 (+포인트 적립) ──
    private final Map<String, LocalDate> attendanceCache = new HashMap<>();

    @PostMapping("/api/attendance")
    @Transactional
    public ResponseEntity<Map<String, Object>> checkAttendance(
            @RequestBody Map<String, String> body) {

        String nick = body.get("nickname");
        if (blank(nick)) return badReq("로그인이 필요합니다.");

        Member member = memberRepository.findByNickname(nick).orElse(null);
        if (member == null) return badReq("회원 정보를 찾을 수 없습니다.");

        LocalDate today = LocalDate.now();
        String cacheKey = nick + "_" + today;

        boolean alreadyDone = attendanceCache.containsKey(cacheKey)
                || cheerPointService.alreadyEarnedToday(member, "ATTENDANCE");

        if (alreadyDone) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "오늘은 이미 출석체크를 했어요! 내일 또 만나요 ⚾",
                    "alreadyDone", true
            ));
        }

        attendanceCache.put(cacheKey, today);
        // oncePerDay=true, seatZone 자동 연결
        cheerPointService.award(member, "ATTENDANCE", 5, "출석체크 " + today, true);

        return ResponseEntity.ok(Map.of(
                "success",     true,
                "message",     "출석체크 완료! +5점 적립! ⚾",
                "alreadyDone", false,
                "points",      5,
                "date",        today.toString(),
                "nickname",    nick
        ));
    }

    @GetMapping("/api/attendance")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getAttendance(
            @RequestParam String nickname) {

        LocalDate today = LocalDate.now();
        boolean doneToday = attendanceCache.containsKey(nickname + "_" + today);
        return ResponseEntity.ok(Map.of("doneToday", doneToday, "nickname", nickname, "date", today.toString()));
    }

    // ── 헬퍼 ──
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

@Data
class CommentRequest {
    private Long   postId;
    private String author;
    private String content;
}
